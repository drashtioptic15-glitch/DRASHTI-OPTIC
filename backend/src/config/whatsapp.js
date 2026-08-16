import StoreSettings from '../models/StoreSettings.js';

export const getWhatsAppConfig = async () => {
  // Check database settings first, then fallback to .env
  const settings = await StoreSettings.findOne();
  
  const phoneNumberId = settings?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const businessAccountId = settings?.whatsappBusinessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
  const accessToken = settings?.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
  
  const isConfigured = Boolean(phoneNumberId && accessToken);

  return {
    phoneNumberId,
    businessAccountId,
    accessToken,
    isConfigured,
    apiVersion: 'v20.0',
    baseUrl: 'https://graph.facebook.com/v20.0',
  };
};
