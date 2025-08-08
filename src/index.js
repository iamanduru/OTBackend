// src/index.js
import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import eventRouter from './routes/eventRoutes.js';
import mpesaRouter from './routes/mpesaRoutes.js';
import orderRouter from './routes/orderRoutes.js';

dotenv.config();

// Required environment sanity check
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set in environment');
  process.exit(1);
}

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ----- Swagger setup with Bearer auth -----
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Film Ticketing API',
      version: '1.0.0',
      description: 'Backend for film ticketing system'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    // Apply globally (individual routes can override)
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js']
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Root redirect to docs
app.get('/', (_req, res) => res.redirect('/api-docs'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Mount routes
app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/events', eventRouter);
app.use('/orders', orderRouter);
app.use('/mpesa', mpesaRouter);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Global error handler (with extra detail in non-production)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const payload = { error: 'Internal server error' };
  if (process.env.NODE_ENV !== 'production') {
    payload.details = err.message;
  }
  res.status(500).json(payload);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});
