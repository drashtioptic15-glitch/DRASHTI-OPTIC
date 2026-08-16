import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    minimumStock: {
      type: Number,
      default: 5,
      min: [0, 'Minimum stock cannot be negative'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for stock status
itemSchema.virtual('stockStatus').get(function () {
  if (this.stock <= 0) return 'Out of Stock';
  if (this.stock <= this.minimumStock) return 'Low Stock';
  return 'In Stock';
});

itemSchema.set('toJSON', { virtuals: true });
itemSchema.set('toObject', { virtuals: true });

const Item = mongoose.model('Item', itemSchema);
export default Item;
