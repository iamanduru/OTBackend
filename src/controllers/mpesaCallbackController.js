import { PrismaClient } from '@prisma/client';
import { buildTicketPDFBuffer } from '../services/pdfServices.js';
import { sendEmailWithAttachments } from '../services/gmailServices.js';

const prisma = new PrismaClient();

export const handleMpesaCallback = async (req, res) => {
  try {
    // Safaricom posts { Body: { stkCallback: { ... } } }
    const callback = req.body?.Body?.stkCallback;
    if (!callback) return res.status(400).json({ error: 'Malformed callback' });

    const { CheckoutRequestID, ResultCode, ResultDesc } = callback;

    // Find the order
    const order = await prisma.order.findUnique({
      where: { checkoutRequestId: CheckoutRequestID },
      include: {
        event: true,
        ticketCategory: true,
        tickets: true, // to check idempotency
      }
    });

    if (!order) {
      console.warn('Callback for unknown order', CheckoutRequestID);
      return res.status(200).json({ result: 'ignored' });
    }

    // Idempotency: if already paid & tickets exist, don't re-issue
    if (order.status === 'PAID' && order.tickets.length > 0) {
      return res.status(200).json({ result: 'already processed' });
    }

    if (ResultCode !== 0) {
      // Payment failed
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' }
      });

      await prisma.auditLog.create({
        data: {
          entity: 'Order',
          entityId: order.id,
          action: 'PAYMENT_FAILED',
          description: `Daraja callback failure: ${ResultDesc}`,
          staffId: null
        }
      });

      return res.status(200).json({ result: 'payment failed recorded' });
    }

    // Payment succeeded: extract metadata
    const items = callback.CallbackMetadata?.Item || [];
    const mpesaReceipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
    const paidAmount = items.find(i => i.Name === 'Amount')?.Value;
    const phone = items.find(i => i.Name === 'PhoneNumber')?.Value;

    // Mark as PAID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        mpesaTransactionId: mpesaReceipt || order.mpesaTransactionId || undefined
      }
    });

    await prisma.auditLog.create({
      data: {
        entity: 'Order',
        entityId: order.id,
        action: 'PAYMENT_CONFIRMED',
        description: `Receipt: ${mpesaReceipt ?? 'N/A'}, amount: ${paidAmount ?? 'N/A'}, phone: ${phone ?? 'N/A'}`,
        staffId: null
      }
    });

    // Create tickets only if none exist yet
    let createdTickets = order.tickets;
    if (!createdTickets || createdTickets.length === 0) {
      const toCreate = Array.from({ length: order.quantity }).map(() => ({
        ticketCode: Math.random().toString(36).slice(2, 9).toUpperCase(),
        orderId: order.id,
        ticketCategoryId: order.ticketCategoryId,
        deliveryMethod: 'EMAIL'
      }));

      await prisma.ticket.createMany({ data: toCreate });
      createdTickets = await prisma.ticket.findMany({ where: { orderId: order.id } });

      await prisma.auditLog.create({
        data: {
          entity: 'Ticket',
          entityId: order.id,
          action: 'ISSUE',
          description: `Issued ${createdTickets.length} tickets for order ${order.id}`,
          staffId: null
        }
      });
    }

    // Affiliate commission (per affiliate)
    if (order.affiliateId) {
      const affiliate = await prisma.affiliate.findUnique({ where: { id: order.affiliateId } });
      if (affiliate) {
        const commissionAmount = Number(order.amount) * Number(affiliate.commissionRate);
        await prisma.affiliateSale.create({
          data: { affiliateId: affiliate.id, orderId: order.id, commissionAmount }
        });
        await prisma.auditLog.create({
          data: {
            entity: 'AffiliateSale',
            entityId: order.id,
            action: 'AFFILIATE_COMMISSION_RECORDED',
            description: `Affiliate ${affiliate.userName} commission: ${commissionAmount.toFixed(2)}`
          }
        });
      }
    }

    // Build PDFs & email
    const attachments = [];
    for (const t of createdTickets) {
      const buffer = await buildTicketPDFBuffer({
        ticket: t,
        order,
        event: order.event,
        category: order.ticketCategory
      });
      attachments.push({
        filename: `${t.ticketCode}.pdf`,
        content: buffer,
        mimeType: 'application/pdf'
      });
    }

    await sendEmailWithAttachments({
      to: order.buyerEmail,
      subject: `${order.event.title} — Your ticket(s)`,
      html: `<p>Hi ${order.buyerName},</p>
             <p>Your payment was confirmed. Your ticket(s) are attached as PDF.</p>
             <p>See you at the event!</p>`,
      attachments
    });

    await prisma.auditLog.create({
      data: {
        entity: 'Order',
        entityId: order.id,
        action: 'EMAIL_SENT',
        description: `Tickets emailed to ${order.buyerEmail}`
      }
    });

    return res.status(200).json({ result: 'success' });
  } catch (err) {
    console.error('Callback processing error:', err);
    return res.status(500).json({ error: 'Internal error processing callback' });
  }
};
