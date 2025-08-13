// src/controllers/adminStatsController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getOverviewStats(req, res, next) {
  try {
    const eventId = req.query.eventId ? Number(req.query.eventId) : undefined;

    const where = eventId ? { eventId } : {};
    const [paidOrders, allCats, ordersByStatus] = await Promise.all([
      prisma.order.aggregate({
        _sum: { amount: true },
        where: { ...where, status: 'PAID' }
      }),
      prisma.ticketCategory.findMany({
        where: eventId ? { eventId } : {},
        include: { tickets: true }
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
        where
      })
    ]);

    const capacity = allCats.reduce((a, c) => a + c.totalQuantity, 0);
    const sold = allCats.reduce((a, c) => a + c.tickets.length, 0);

    res.json({
      revenue: Number(paidOrders._sum.amount || 0),
      capacity,
      sold,
      remaining: capacity - sold,
      orders: ordersByStatus.reduce((acc, r) => ({ ...acc, [r.status]: r._count.status }), {}),
      categories: allCats.map(c => ({
        id: c.id, name: c.name, price: Number(c.price),
        total: c.totalQuantity, sold: c.tickets.length, remaining: c.totalQuantity - c.tickets.length
      }))
    });
  } catch (e) { next(e); }
}
