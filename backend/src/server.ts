import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import prisma from './config/database';
import authRoutes from './modules/auth/auth.routes';
import adminSettingsRoutes from './modules/admin/settings/settings.routes';

import { sanitizeInput } from './utils/sanitizer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Utility Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    // Check DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      data: {
        status: 'UP',
        timestamp: new Date().toISOString(),
        database: 'CONNECTED',
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: {
        status: 'DOWN',
        timestamp: new Date().toISOString(),
        database: 'DISCONNECTED',
        error: error instanceof Error ? error.message : 'Unknown database error',
      },
    });
  }
});

// Root API Welcome
app.get('/api/v1', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to OpenRMI Enterprise API v1',
    data: {
      version: '1.0.0',
      regulation: 'PER-2/MBU/03/2023 & Juknis 8 Per-2 BUMN 2023',
    },
  });
});

// Authentication Routes
app.use('/api/v1/auth', authRoutes);

// Admin System Settings Routes (termasuk batas ukuran upload file)
app.use('/api/v1/admin/system', adminSettingsRoutes);

// Centralized error handling middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[OpenRMI Backend] Server running on port ${PORT} (Environment: ${process.env.NODE_ENV || 'development'})`);
  });
}

export default app;
