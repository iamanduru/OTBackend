import express from 'express';
import { PrismaClient } from '@prisma/client';
import { buildTicketPDFBuffer } from '../services/pdfServices.js';

const prisma = new PrismaClient();
const router = express.Router();

/**
 * GET /tickets/:code.pdf
 * Serves a generated PDF for the ticket code
 */
router.get('/:code.pdf', async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode: req.params.code },
      include: { order: { include: { event: true } }, category: true }
    });
    if (!ticket) return res.status(404).send('Not found');

    const buffer = await buildTicketPDFBuffer({
      ticket,
      order: ticket.order,
      event: ticket.order.event,
      category: ticket.category
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${ticket.ticketCode}.pdf"`);
    res.send(buffer);
  } catch (e) { next(e); }
});

export default router;