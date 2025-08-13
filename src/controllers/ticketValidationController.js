import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function validateTicket(req, res, next) {
    try {
        const { code } = req.params;
        const ticket = await prisma.ticket.findUnique({
            where: { ticketCode: code },
            include: { order: { include: { event: true, ticketCategory: true}}}
        });
        if(!ticket) return res.status(404).json({ valid: false, reason: 'NOT_FOUND' });

        res.json({
            valid: !ticket.used,
            used: ticket.used,
            event: { id: ticket.order.event.id, title: ticket.order.event.title, startTime: ticket.order.event.startTime },
            category: ticket.order.ticketCategory.name,
            buyer: { name: ticket.order.buyerName, email: ticket.order.buyerEmail }
        });
    } catch (error) {
        next(error);
    }
}

export async function useTicket(req, res, next) {
  try {
    const { code } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode: code },
      include: { order: { include: { event: true } } }
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.used) return res.status(200).json({ message: 'Already used', used: true });

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { used: true }
    });

    await prisma.auditLog.create({
      data: {
        entity: 'Ticket',
        entityId: ticket.id,
        action: 'USE',
        description: `Ticket ${ticket.ticketCode} marked used at entry`,
        staffId: req.user?.userId ?? null
      }
    });

    res.json({ message: 'Admitted', used: updated.used });
  } catch (err) { next(err); }
}