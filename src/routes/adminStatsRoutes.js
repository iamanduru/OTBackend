// src/routes/adminStatsRoutes.js
import express from 'express';
import { getOverviewStats } from '../controllers/adminStatsController.js';
import { requireAuth } from '../middlewares/auth.js';
import { allowRoles } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin Stats
 *   description: KPIs and summaries for dashboard
 */

/**
 * @swagger
 * /admin/stats/overview:
 *   get:
 *     summary: Overview KPIs for dashboard
 *     tags: [Admin Stats]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: eventId
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.get('/overview', requireAuth, allowRoles('ADMIN','DIRECTOR'), getOverviewStats);

export default router;
