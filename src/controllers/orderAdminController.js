// src/controllers/orderAdminController.js
import { PrismaClient } from '@prisma/client';
import { buildTicketPDFBuffer } from '../services/pdfServices.js';
import { sendEmailWithAttachments } from '../services/gmailServices.js';

const prisma = new PrismaClient();

// GET /admin/orders
export async function listOrders(req, res, next) {
  try {
    const { status, q, page = 1, pageSize = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { buyerEmail: { contains: q, mode: 'insensitive' } },
              { buyerName: { contains: q, mode: 'insensitive' } },
              { mpesaTransactionId: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          event: true,
          ticketCategory: true,
          _count: { select: { tickets: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ total, page: Number(page), pageSize: Number(pageSize), items });
  } catch (err) {
    next(err);
  }
}

// GET /admin/orders/:id
export async function getOrder(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { event: true, ticketCategory: true, tickets: true, affiliate: true },
    });
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
}

// POST /admin/orders/:id/resend
export async function resendTickets(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { event: true, ticketCategory: true, tickets: true },
    });
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (order.status !== 'PAID') return res.status(400).json({ error: 'Order not paid' });
    if (!order.tickets || order.tickets.length === 0) return res.status(400).json({ error: 'No tickets on order' });

    const attachments = [];
    for (const t of order.tickets) {
      const buffer = await buildTicketPDFBuffer({
        ticket: t,
        order,
        event: order.event,
        category: order.ticketCategory,
      });
      attachments.push({ filename: `${t.ticketCode}.pdf`, content: buffer, mimeType: 'application/pdf' });
    }

    await sendEmailWithAttachments({
      to: order.buyerEmail,
      subject: `${order.event.title} — Your ticket(s) (Resent)`,
      html: `<p>Hi ${order.buyerName},</p><p>Here are your ticket(s) again.</p>`,
      attachments,
    });

    await prisma.auditLog.create({
      data: {
        entity: 'Order',
        entityId: order.id,
        action: 'EMAIL_RESENT',
        description: `Resent ${attachments.length} tickets to ${order.buyerEmail}`,
        staffId: req.user?.userId ?? null,
      },
    });

    res.json({ message: 'Tickets resent' });
  } catch (err) {
    next(err);
  }
}
