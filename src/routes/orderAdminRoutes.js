import express from 'express';
import { listOrders, getOrder, resendTickets } from '../controllers/orderAdminController.js';
import { requireRole, requireAuth } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Orders (Admin)
 *   description: Admin endpoints for managing orders
 */

/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: List orders (filterable)
 *     tags: [Orders (Admin)]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, PAID, FAILED] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
router.get('/', requireRole('ADMIN', 'DIRECTOR'), listOrders);

/**
 * @swagger
 * /admin/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders (Admin)]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get('/:id', requireRole('ADMIN', 'DIRECTOR'), getOrder);

/**
 * @swagger
 * /admin/orders/{id}/resend:
 *   post:
 *     summary: Resend ticket PDFs to buyer via email
 *     tags: [Orders (Admin)]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Resent }
 *       400: { description: Invalid state }
 *       404: { description: Not found }
 */
router.post('/:id/resend', requireRole('ADMIN', 'DIRECTOR'), resendTickets);

export default router;
