import express from 'express';
import { validateTicket, useTicket } from '../controllers/ticketValidationController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: TicketValidation
 *   description: Validate and mark tickets as used (door/staff)
 */

/**
 * @swagger
 * /tickets/validate/{code}:
 *   get:
 *     summary: Validate a ticket code (read-only)
 *     tags: [TicketValidation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket code
 *     responses:
 *       200:
 *         description: Validation result
 *       404:
 *         description: Ticket not found
 */
router.get('/validate/:code', requireAuth, validateTicket);

/**
 * @swagger
 * /tickets/use/{code}:
 *   post:
 *     summary: Mark a ticket as used (admit)
 *     tags: [TicketValidation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Marked used / already used
 *       404:
 *         description: Ticket not found
 */
router.post('/use/:code', requireAuth, useTicket);

export default router;
