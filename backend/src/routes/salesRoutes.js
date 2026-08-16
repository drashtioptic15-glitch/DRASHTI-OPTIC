import express from 'express';
import {
  getSales,
  getSaleById,
  createSale,
  getInvoicePDF,
  sendWhatsAppInvoice,
  deleteSale,
} from '../controllers/salesController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getSales).post(createSale);
router.route('/:id').get(getSaleById).delete(deleteSale);
router.get('/:id/pdf', getInvoicePDF);
router.post('/:id/send-whatsapp', sendWhatsAppInvoice);

export default router;
