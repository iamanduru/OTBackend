import express from 'express';
import { handleMpesaCallback } from '../controllers/mpesaCallbackController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: M-Pesa
 *   description: Payment callbacks
 */

/**
 * @swagger
 * /mpesa/ping:
 *   get:
 *     summary: Quick check that the M-Pesa webhook route is reachable
 *     tags: [M-Pesa]
 *     security: []          # public
 *     responses:
 *       200:
 *         description: Pong
 */
router.get('/ping', (_req, res) => res.json({ pong: true }));

/**
 * @swagger
 * /mpesa/callback:
 *   post:
 *     summary: Endpoint for Daraja to POST payment result
 *     description: Public webhook endpoint used by Safaricom Daraja STK Push results.
 *     tags: [M-Pesa]
 *     security: []          # override global bearer requirement so it shows as public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Acknowledgment
 */
router.post('/callback', express.json(), handleMpesaCallback);

export default router;
