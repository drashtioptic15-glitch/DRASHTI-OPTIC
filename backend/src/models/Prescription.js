import mongoose from 'mongoose';

const eyeDetailsSchema = new mongoose.Schema(
  {
    sph: { type: String, default: '' },
    cyl: { type: String, default: '' },
    axis: { type: String, default: '' },
    vn: { type: String, default: '' },
    add: { type: String, default: '' },
    pd: { type: String, default: '' },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    rightEye: {
      type: eyeDetailsSchema,
      default: () => ({}),
    },
    leftEye: {
      type: eyeDetailsSchema,
      default: () => ({}),
    },
    doctor: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    prescriptionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Prescription = mongoose.model('Prescription', prescriptionSchema);
export default Prescription;
