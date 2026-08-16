import mongoose from 'mongoose';

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: 'Drashti Optic',
    },
    tagline: {
      type: String,
      default: 'EYEGLASSES | CONTACT LENSES | SUNGLASSES',
    },
    logoUrl: {
      type: String,
      default: '/logo.png',
    },
    address: {
      type: String,
      default: 'Swaminarayn Chowk',
    },
    city: {
      type: String,
      default: 'Rajkot',
    },
    state: {
      type: String,
      default: 'Gujarat',
    },
    pincode: {
      type: String,
      default: '380001',
    },
    phone: {
      type: String,
      default: '+91 98765 43210',
    },
    email: {
      type: String,
      default: 'contact@drashtioptic.com',
    },
    website: {
      type: String,
      default: 'www.drashtioptic.com',
    },
    gstNumber: {
      type: String,
      default: '24ABCDE1234F1Z5',
    },
    invoicePrefix: {
      type: String,
      default: 'INV',
    },
    invoiceFooter: {
      type: String,
      default: 'Thank you for choosing Drashti Optic! Goods once sold will be serviced with care. Please carry this invoice for warranty and complimentary adjustments.',
    },
    whatsappPhoneNumberId: {
      type: String,
      default: '',
    },
    whatsappBusinessAccountId: {
      type: String,
      default: '',
    },
    whatsappAccessToken: {
      type: String,
      default: '',
    },
    currencySymbol: {
      type: String,
      default: '₹',
    },
    taxRate: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const StoreSettings = mongoose.model('StoreSettings', storeSettingsSchema);
export default StoreSettings;
