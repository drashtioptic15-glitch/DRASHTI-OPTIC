import mongoose from 'mongoose';

const phoneNumberSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    label: {
      type: String,
      required: [true, 'Label / Contact Name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['Customer', 'Supplier', 'Doctor', 'Other'],
      default: 'Customer',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
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

const PhoneNumber = mongoose.model('PhoneNumber', phoneNumberSchema);
export default PhoneNumber;
