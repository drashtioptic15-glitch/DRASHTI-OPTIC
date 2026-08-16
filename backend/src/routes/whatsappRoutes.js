import express from 'express';
import {
  verifyWebhook,
  handleWebhookEvent,
} from '../controllers/whatsappWebhookController.js';

const router = express.Router();

// Meta WhatsApp Webhook endpoints
router.route('/webhook')
  .get(verifyWebhook)
  .post(handleWebhookEvent);

export default router;
