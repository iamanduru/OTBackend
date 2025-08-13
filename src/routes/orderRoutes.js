// src/routes/orderRoutes.js
import express from 'express';
import { createOrder } from '../controllers/orderController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order creation & checkout via M-Pesa STK Push
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateOrderRequest:
 *       type: object
 *       required:
 *         - eventId
 *         - ticketCategoryId
 *         - quantity
 *         - buyerName
 *         - buyerEmail
 *         - buyerPhone
 *       properties:
 *         eventId:
 *           type: integer
 *           example: 1
 *         ticketCategoryId:
 *           type: integer
 *           example: 2
 *         quantity:
 *           type: integer
 *           example: 2
 *         buyerName:
 *           type: string
 *           example: John Doe
 *         buyerEmail:
 *           type: string
 *           format: email
 *           example: john@example.com
 *         buyerPhone:
 *           type: string
 *           example: "+254700000000"
 *         affiliateCode:
 *           type: string
 *           description: Optional; can also come from X-Affiliate-Code header or 'aff' cookie.
 *     CreateOrderResponse:
 *       type: object
 *       properties:
 *         orderId:
 *           type: integer
 *           example: 42
 *         amount:
 *           type: number
 *           example: 300
 *         checkoutRequestId:
 *           type: string
 *           example: "ws_CO_123456789"
 *         merchantRequestId:
 *           type: string
 *           example: "29115-34620561-1"
 *         message:
 *           type: string
 *           example: "STK Push initiated. Complete payment on your phone."
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create an order and initiate M-Pesa STK Push
 *     description: Creates a pending order and sends an STK Push to the buyer's phone.
 *     tags: [Orders]
 *     security: []   # override global bearerAuth; this endpoint is public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: STK Push initiated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateOrderResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createOrder);

export default router;
