import { PrismaClient } from '@prisma/client';
import validator from 'validator';
import { initiateStkPush } from '../services/mpesaServices.js'; // ensure filename matches
// import { Prisma } from '@prisma/client'; // only needed if you want strict Decimal handling
import { normalizeMsisdnKE } from '../utils/phone.js';

const prisma = new PrismaClient();

export const createOrder = async (req, res, next) => {
  try {
    const {
      eventId,
      ticketCategoryId,
      quantity,
      buyerName,
      buyerEmail,
      buyerPhone,
      affiliateCode: bodyAffiliateCode
      // deliveryMethod // we ignore this now, EMAIL only
    } = req.body;

    if (!eventId || !ticketCategoryId || !quantity || !buyerName || !buyerEmail || !buyerPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!validator.isEmail(buyerEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    // Validate category + event
    const category = await prisma.ticketCategory.findUnique({
      where: { id: ticketCategoryId },
      include: { event: true, tickets: true }
    });
    if (!category || category.eventId !== eventId) {
      return res.status(400).json({ error: 'Category does not belong to specified event' });
    }

    // Availability
    const sold = category.tickets.length;
    const available = category.totalQuantity - sold;
    if (quantity > available) {
      return res.status(400).json({ error: `Only ${available} tickets available in this category` });
    }

    // Resolve affiliate code from multiple places (body > header > cookie > query)
    const headerAffiliateCode = req.headers['x-affiliate-code']?.toString();
    const cookieAffiliateCode = req.cookies?.aff;
    const queryAffiliateCode = req.query?.affiliateCode?.toString();

    const affiliateCode =
      bodyAffiliateCode ||
      headerAffiliateCode ||
      cookieAffiliateCode ||
      queryAffiliateCode ||
      null;

    // Optional affiliate lookup; do NOT block order if invalid—just ignore
    let affiliateId = null;
    if (affiliateCode) {
      const aff = await prisma.affiliate.findUnique({ where: { referralCode: affiliateCode } });
      if (aff) {
        affiliateId = aff.id;
      } else {
        // Non-blocking: record that an invalid code was provided
        await prisma.auditLog.create({
          data: {
            entity: 'Order',
            entityId: 0, // not created yet, so 0/sentinel
            action: 'AFFILIATE_IGNORED',
            description: `Invalid affiliate code provided: ${affiliateCode}`,
            staffId: null
          }
        });
      }
    }

    // Safer cast for Decimal
    const unitPrice = Math.round(parseFloat(String(category.price)));
    const amount = unitPrice * quantity;

    // Normalize phone for Daraja (2547XXXXXXXX)
    const msisdn = normalizeMsisdnKE(buyerPhone);

    // Create PENDING order (email-only delivery)
    const order = await prisma.order.create({
      data: {
        eventId,
        ticketCategoryId,
        quantity,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim().toLowerCase(),
        buyerPhone: msisdn,  // store normalized form
        amount,
        status: 'PENDING',
        affiliateId
      }
    });

    // Audit: order created
    await prisma.auditLog.create({
      data: {
        entity: 'Order',
        entityId: order.id,
        action: 'CREATE',
        description: `Order ${order.id} created for event ${eventId}, category ${ticketCategoryId}, quantity ${quantity}`,
        staffId: null
      }
    });

    // Initiate STK Push
    const accountRef = `ORD-${order.id}`;
    const transactionDesc = 'Film ticket purchase';

    const stkResponse = await initiateStkPush({
      amount,
      phoneNumber: msisdn,      // already in 2547XXXXXXXX
      accountReference: accountRef,
      transactionDesc,
      orderId: order.id
    });

    // Save CheckoutRequestID
    await prisma.order.update({
      where: { id: order.id },
      data: { checkoutRequestId: stkResponse.CheckoutRequestID }
    });

    // Audit: payment initiated
    await prisma.auditLog.create({
      data: {
        entity: 'Order',
        entityId: order.id,
        action: 'PAYMENT_INITIATED',
        description: `STK Push initiated. CheckoutRequestID: ${stkResponse.CheckoutRequestID}`,
        staffId: null
      }
    });

    res.status(201).json({
      orderId: order.id,
      amount,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      merchantRequestId: stkResponse.MerchantRequestID,
      message: 'STK Push initiated. Complete payment on your phone.'
    });
  } catch (error) {
    next(error);
  }
};