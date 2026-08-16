import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import numberRoutes from './routes/numberRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';

import bcrypt from 'bcryptjs';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to SQLite Database
await connectDB();

// Ensure default admin exists
try {
  const existingAdmin = await User.findOne({});
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', salt);
    await User.create({
      name: process.env.ADMIN_NAME || 'Drashti Optic Owner',
      email: (process.env.ADMIN_EMAIL || 'admin@drashtioptic.com').toLowerCase().trim(),
      passwordHash,
      isActive: true,
    });
    console.log('[SQLite] Default admin user initialized.');
  }
} catch (err) {
  console.error('[SQLite] Admin init notice:', err.message);
}

const app = express();

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins (reflection for credentials support)
      return callback(null, origin || true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static directories for invoices and uploaded files
const invoicesDir = path.join(__dirname, '../generated-invoices');
app.use('/invoices', express.static(invoicesDir));

// Apply API rate limiter to all API endpoints
app.use('/api', apiLimiter);

// Health Check
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'Drashti Optic Backend API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/invoices', salesRoutes); // Alias for convenience
app.use('/api/transactions', transactionRoutes);
app.use('/api/numbers', numberRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Fallback 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.BACKEND_PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`👓 DRASHTI OPTIC BILLING BACKEND SERVICE RUNNING`);
  console.log(`📡 Port: ${PORT} (0.0.0.0)`);
  console.log(`🌍 Health: http://localhost:${PORT}/api/health`);
  console.log(`==================================================\n`);
});
