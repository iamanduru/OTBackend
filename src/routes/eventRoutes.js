// src/routes/eventRoutes.js
import express from 'express';
import {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent
} from '../controllers/eventController.js';
import { requireRole } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event and ticket category management
 *
 * components:
 *   schemas:
 *     TicketCategoryInput:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - totalQuantity
 *       properties:
 *         name:
 *           type: string
 *           example: VIP
 *         price:
 *           type: number
 *           example: 150.00
 *         totalQuantity:
 *           type: integer
 *           example: 30
 *     EventCategoryOutput:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         price:
 *           type: number
 *         totalQuantity:
 *           type: integer
 *         sold:
 *           type: integer
 *         available:
 *           type: integer
 *     EventResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         startTime:
 *           type: string
 *           format: date-time
 *         categories:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EventCategoryOutput'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateEventRequest:
 *       type: object
 *       required:
 *         - title
 *         - startTime
 *         - categories
 *       properties:
 *         title:
 *           type: string
 *           example: "Film Launch Premiere"
 *         description:
 *           type: string
 *           example: "Exclusive premiere of the new film."
 *         startTime:
 *           type: string
 *           format: date-time
 *           example: "2025-08-15T18:00:00Z"
 *         categories:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TicketCategoryInput'
 *     UpdateEventRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "Updated Premiere Title"
 *         description:
 *           type: string
 *         startTime:
 *           type: string
 *           format: date-time
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new event with its ticket categories
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEventRequest'
 *     responses:
 *       201:
 *         description: Created event with availability per category
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 *       400:
 *         description: Validation error (e.g., missing fields, invalid date, malformed categories)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden (not ADMIN)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', requireRole('ADMIN'), createEvent);

/**
 * @swagger
 * /events:
 *   get:
 *     summary: List all events with ticket category availability
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: Array of events including per-category sold/available counts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EventResponse'
 */
router.get('/', listEvents);

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get a single event by ID (with category availability)
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getEvent);

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     summary: Update an event's core information (title, description, startTime)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEventRequest'
 *     responses:
 *       200:
 *         description: Updated event object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden (not ADMIN)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', requireRole('ADMIN'), updateEvent);

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *         type: integer
 *         required: true
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Deletion confirmation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Event deleted
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', requireRole('ADMIN'), deleteEvent);

export default router;
