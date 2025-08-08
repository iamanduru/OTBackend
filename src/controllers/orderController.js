import { PrismaClient } from '@prisma/client';
import validator from 'validator';
import { initiateStkPush } from '../services/mpesaServices.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

function generateTicketCode() {
    return uuidv4().split('-')[0].toUpperCase();
}

export const createOrder = async (req, resizeBy, next) => {
    try {
    const {
        eventId,
        ticketCategoryId,
        quantity,
        buyerName,
        buyerEmail,
        buyerPhone,
        affiliateCode,
        deliveryMethod // 'EMAIL', 'WHATSAPP', or 'BOTH'
    } = req.body;

    if (
      !eventId ||
      !ticketCategoryId ||
      !quantity ||
      !buyerName ||
      !buyerEmail ||
      !buyerPhone ||
      !deliveryMethod
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!validator.isEmail(buyerEmail)) {
        return res.status(400).json({ error: 'Invalid email format'});
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    //Validate category + event
    const category = await prisma.ticketCategory.findUnique({
        where: { id: ticketCategoryId },
        include: {event: true, tickets: true }
    });

    if (!category || category.eventId !== eventId) {
      return res.status(400).json({ error: 'Category does not belong to specified event' });
    }

    //Check availability
    const sold = category.tickets.length;
    const available = category.totalQuantity - sold;
    if (quantity> available) {
        return res.status(400).json({ error: `Only ${available} tickets available in this category` });
    }

    //Resolve affiliate if provided
    let affiliate = null;
    let affiliateId = null;
    if (affiliateCode) {
    affiliate = await prisma.affiliate.findUnique({ where: { referralCode: affiliateCode } });
    if (!affiliate) return res.status(400).json({ error: 'Invalid affiliate code' });
    affiliateId = affiliate.id;
    }

    const amount = Number(category.price) * quantity;

    //Create pending order
    const order = await prisma.order.create({
        data: {
            eventId,
            ticketCategoryId,
            quantity,
            buyerName: buyerName.trim(),
            buyerEmail: buyerEmail.trim().toLowerCase(),
            buyerPhone: buyerPhone.trim(),
            amount,
            status: 'PENDING',
            affiliateId     // <— store it for commission later
        }
    });

    //Audit logs creation
    await prisma.auditLog.create({
      data: {
        entity: 'Order',
        entityId: order.id,
        action: 'CREATE',
        description: `Order ${order.id} created for event ${eventId}, category ${ticketCategoryId}, quantity ${quantity}`,
        staffId: null // system / anonymous (no staff)
      }
    });

    //Initiate STK Push
    const accountRef = `ORD-${order.id}`;
    const transactionDesc = 'Film ticket purchase';
    const phone = buyerPhone.startsWith('+') ? buyerPhone : `+${buyerPhone}`;

    const stkResponse = await initiateStkPush({
        amount,
        phoneNumber: phone,
        accountReference: accountRef,
        transactionDesc,
        orderId: order.id
    });

    //Save checkoutRequestId to order for later callback matching
    await prisma.order.update({
        where: { id: order.id },
        data: {
            checkoutRequestId: stkResponse.CheckoutRequestID
        }
    });

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