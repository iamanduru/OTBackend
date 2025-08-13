import express from 'express';

const router = express.Router();

/**
 * @swagger
 * /r/{code}:
 *   get:
 *     summary: Affiliate link redirect; sets 'aff' cookie
 *     tags: [Affiliates]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       302: { description: Redirects to frontend with cookie set }
 */
router.get('/r/:code', (req, res) => {
  const code = req.params.code;
  // 30-day cookie
  res.cookie('aff', code, { httpOnly: false, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax' });

  const FE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  // Send them to your purchase page; include code in query purely for UI (cookie is what backend uses)
  res.redirect(`${FE_URL}/checkout?affiliateCode=${encodeURIComponent(code)}`);
});

export default router;
