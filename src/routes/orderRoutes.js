import express from 'express';
import { createOrder } from '../controllers/orderController.js';

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order creation and checkout
 *
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
 *         - deliveryMethod
 *       properties:
 *         eventId:
 *           type: integer
 *         ticketCategoryId:
 *           type: integer
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
 *           example: CELEB123
 *         deliveryMethod:
 *           type: string
 *           enum: [EMAIL, WHATSAPP, BOTH]
 *           example: EMAIL
 *     CreateOrderResponse:
 *       type: object
 *       properties:
 *         orderId:
 *           type: integer
 *         amount:
 *           type: number
 *         checkoutRequestId:
 *           type: string
 *         merchantRequestId:
 *           type: string
 *         message:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

const router = express.Router();

router.post('/', createOrder);

export default router;
