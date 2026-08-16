import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    paymentType: {
      type: String,
      enum: ['Cash', 'Online', 'UPI', 'Card', 'Other'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than 0'],
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Completed', 'Pending', 'Failed'],
      default: 'Completed',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.statics.generateTransactionId = async function () {
  const currentYear = new Date().getFullYear();
  const prefix = `TXN-${currentYear}-`;
  
  const lastTxn = await this.findOne({
    transactionId: new RegExp(`^${prefix}`),
  }).sort({ createdAt: -1 });

  if (!lastTxn) {
    return `${prefix}000001`;
  }

  const parts = lastTxn.transactionId.split('-');
  const seqStr = parts[parts.length - 1];
  const nextSeq = parseInt(seqStr, 10) + 1;
  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
};

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
