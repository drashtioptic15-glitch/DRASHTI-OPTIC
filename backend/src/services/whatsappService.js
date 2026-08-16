import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { getWhatsAppConfig } from '../config/whatsapp.js';
import StoreSettings from '../models/StoreSettings.js';

/**
 * Format phone number to international E.164 without '+'
 * Example: 9876543210 -> 919876543210 (India standard)
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  // Remove spaces, hyphens, parentheses, plus
  let cleaned = String(phone).replace(/[\s\-\(\)\+]/g, '');
  
  // If 10 digits (Standard Indian mobile), prepend country code 91
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
};

/**
 * Upload invoice PDF to WhatsApp Cloud API Media endpoint and send as document
 */
export const sendInvoiceViaWhatsApp = async (invoice, pdfFilePath) => {
  try {
    const config = await getWhatsAppConfig();
    const settings = await StoreSettings.findOne();
    const storeName = settings?.storeName || 'Drashti Optic';

    if (!config.isConfigured) {
      console.warn('[WhatsApp] WhatsApp Cloud API credentials not configured in settings or .env');
      return {
        success: false,
        status: 'Not Configured',
        error: 'WhatsApp API credentials (Phone Number ID / Access Token) not configured.',
      };
    }

    const customerPhone = invoice.customerSnapshot?.mobile || invoice.customer?.mobile;
    if (!customerPhone) {
      return {
        success: false,
        status: 'Failed',
        error: 'Customer mobile number missing.',
      };
    }

    const recipient = formatPhoneNumber(customerPhone);
    if (!recipient || recipient.length < 10) {
      return {
        success: false,
        status: 'Failed',
        error: `Invalid customer mobile number: ${customerPhone}`,
      };
    }

    if (!fs.existsSync(pdfFilePath)) {
      return {
        success: false,
        status: 'Failed',
        error: 'Generated PDF invoice file not found on server.',
      };
    }

    // Step 1: Upload PDF to WhatsApp Media API
    console.log(`[WhatsApp] Uploading PDF media for Invoice ${invoice.invoiceNumber}...`);
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'application/pdf');
    formData.append('file', fs.createReadStream(pdfFilePath), {
      filename: `Invoice-${invoice.invoiceNumber}.pdf`,
      contentType: 'application/pdf',
    });

    const mediaUploadUrl = `${config.baseUrl}/${config.phoneNumberId}/media`;
    const mediaResponse = await axios.post(mediaUploadUrl, formData, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        ...formData.getHeaders(),
      },
      timeout: 30000,
    });

    const mediaId = mediaResponse.data?.id;
    if (!mediaId) {
      throw new Error('Failed to retrieve Media ID from WhatsApp Cloud API response.');
    }
    console.log(`[WhatsApp] Media uploaded successfully. Media ID: ${mediaId}`);

    // Step 2: Send Document Message
    const caption = `Thank you for shopping with ${storeName}.\n\nYour invoice #${invoice.invoiceNumber} (Total: ₹${invoice.grandTotal}) is attached.\n\nThank you for choosing us!`;
    
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'document',
      document: {
        id: mediaId,
        caption: caption,
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
      },
    };

    const messageUrl = `${config.baseUrl}/${config.phoneNumberId}/messages`;
    const messageResponse = await axios.post(messageUrl, messagePayload, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    });

    const messageId = messageResponse.data?.messages?.[0]?.id || 'WA-MSG-' + Date.now();
    console.log(`[WhatsApp] Message dispatched successfully to ${recipient}. Message ID: ${messageId}`);

    return {
      success: true,
      status: 'Sent',
      messageId: messageId,
      sentAt: new Date(),
    };
  } catch (error) {
    const errorDetails = error.response?.data?.error?.message || error.message;
    console.error(`[WhatsApp Error] Failed to send PDF to customer: ${errorDetails}`);
    return {
      success: false,
      status: 'Failed',
      error: errorDetails,
    };
  }
};
