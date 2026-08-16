import express from 'express';
import {
  getDashboardStats,
  getSalesReport,
  getProductReport,
  getCustomerReport,
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/sales', getSalesReport);
router.get('/products', getProductReport);
router.get('/customers', getCustomerReport);

export default router;
