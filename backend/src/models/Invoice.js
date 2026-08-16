import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'Item reference is required'],
    },
    name: {
      type: String,
      required: true,
    },
    categoryName: {
      type: String,
      default: '',
    },
    sku: {
      type: String,
      default: '',
    },
    brand: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'fixed',
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
      index: true,
    },
    customerSnapshot: {
      name: { type: String, required: true },
      mobile: { type: String, required: true },
      alternateMobile: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    includePrescription: {
      type: Boolean,
      default: true,
    },
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
    },
    prescriptionSnapshot: {
      rightEye: {
        sph: { type: String, default: '' },
        cyl: { type: String, default: '' },
        axis: { type: String, default: '' },
        vn: { type: String, default: '' },
        add: { type: String, default: '' },
        pd: { type: String, default: '' },
      },
      leftEye: {
        sph: { type: String, default: '' },
        cyl: { type: String, default: '' },
        axis: { type: String, default: '' },
        vn: { type: String, default: '' },
        add: { type: String, default: '' },
        pd: { type: String, default: '' },
      },
      doctor: { type: String, default: '' },
      notes: { type: String, default: '' },
    },
    items: [invoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
    },
    overallDiscountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'fixed',
    },
    overallDiscountValue: {
      type: Number,
      default: 0,
    },
    overallDiscountAmount: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    cashAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    onlineAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Partial', 'Due'],
      required: true,
      default: 'Due',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Online', 'UPI', 'Card', 'Split', 'Other'],
      default: 'Cash',
    },
    pdfPath: {
      type: String,
      default: '',
    },
    whatsappStatus: {
      type: String,
      enum: ['Pending', 'Sent', 'Delivered', 'Read', 'Failed', 'Not Configured'],
      default: 'Pending',
    },
    whatsappMessageId: {
      type: String,
      default: '',
    },
    whatsappError: {
      type: String,
      default: '',
    },
    whatsappSentAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helper to generate next invoice number
invoiceSchema.statics.generateInvoiceNumber = async function () {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;
  
  // Find highest invoice number for current year
  const lastInvoice = await this.findOne({
    invoiceNumber: new RegExp(`^${prefix}`),
  }).sort({ createdAt: -1 });

  if (!lastInvoice) {
    return `${prefix}000001`;
  }

  const parts = lastInvoice.invoiceNumber.split('-');
  const seqStr = parts[parts.length - 1];
  const nextSeq = parseInt(seqStr, 10) + 1;
  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
};

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
