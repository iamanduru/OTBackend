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
 * /mpesa/callback:
 *   post:
 *     summary: Endpoint for Daraja to POST payment result
 *     tags: [M-Pesa]
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