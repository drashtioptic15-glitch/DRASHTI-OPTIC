import Invoice from '../models/Invoice.js';
import StoreSettings from '../models/StoreSettings.js';

/**
 * @desc    Verify Meta WhatsApp Webhook
 * @route   GET /api/whatsapp/webhook
 * @access  Public (Meta Platform Verification)
 */
export const verifyWebhook = async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Get expected verify token from database or environment variable
    const settings = await StoreSettings.findOne();
    const expectedToken =
      settings?.whatsappWebhookVerifyToken ||
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
      'drashti_whatsapp_verify_2026';

    console.log(`[WhatsApp Webhook] Verification request received. Mode: ${mode}`);

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[WhatsApp Webhook] Verification successful! Challenge returned.');
      return res.status(200).send(challenge);
    } else {
      console.warn(`[WhatsApp Webhook] Verification failed. Token mismatch: expected "${expectedToken}", received "${token}"`);
      return res.sendStatus(403);
    }
  } catch (error) {
    console.error('[WhatsApp Webhook Verify Error]', error);
    return res.sendStatus(500);
  }
};

/**
 * @desc    Handle incoming WhatsApp webhook events (delivery statuses, incoming customer messages)
 * @route   POST /api/whatsapp/webhook
 * @access  Public (Meta Webhook Dispatcher)
 */
export const handleWebhookEvent = async (req, res) => {
  try {
    const body = req.body;

    // Meta Webhook payload check
    if (body.object === 'whatsapp_business_account' || body.entry) {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;

          // 1. Handle Message Status Updates (sent, delivered, read, failed)
          if (value?.statuses) {
            for (const statusObj of value.statuses) {
              const messageId = statusObj.id;
              const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
              const recipientId = statusObj.recipient_id;

              console.log(`[WhatsApp Status Event] Message ${messageId} to ${recipientId} is now: ${status}`);

              let newStatus = 'Sent';
              if (status === 'delivered') newStatus = 'Delivered';
              else if (status === 'read') newStatus = 'Read';
              else if (status === 'failed') newStatus = 'Failed';

              try {
                // Update corresponding invoice if stored with message ID
                const invoice = await Invoice.findOne({ whatsappMessageId: messageId });
                if (invoice) {
                  await Invoice.findByIdAndUpdate(invoice._id, {
                    whatsappStatus: newStatus,
                  });
                  console.log(`[WhatsApp Status] Updated Invoice #${invoice.invoiceNumber} WhatsApp status to "${newStatus}"`);
                }
              } catch (err) {
                console.error(`[WhatsApp Status DB Update Error]`, err.message);
              }
            }
          }

          // 2. Handle Incoming Customer Messages
          if (value?.messages) {
            for (const msg of value.messages) {
              console.log(`[WhatsApp Incoming Message] From: ${msg.from} | Type: ${msg.type} | Text: ${msg.text?.body || '[Non-text]'}`);
            }
          }
        }
      }

      // Meta requires immediate 200 OK
      return res.status(200).send('EVENT_RECEIVED');
    }

    // Default response
    return res.status(200).send('OK');
  } catch (error) {
    console.error('[WhatsApp Webhook Event Error]', error);
    // Still return 200 to prevent Meta from retrying indefinitely
    return res.status(200).send('EVENT_RECEIVED');
  }
};
