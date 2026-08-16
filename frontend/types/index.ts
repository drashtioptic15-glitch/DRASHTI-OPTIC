export interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

export interface Customer {
  _id: string;
  customerId: string;
  name: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  totalPurchases: number;
  totalPaid: number;
  totalDue: number;
  lastPurchaseDate?: string;
  createdAt: string;
  updatedAt: string;
  invoices?: Invoice[];
  prescriptions?: Prescription[];
}

export interface EyeDetails {
  sph: string;
  cyl: string;
  axis: string;
  vn?: string;
  add: string;
  pd: string;
}

export interface Prescription {
  _id: string;
  customer: string | Customer;
  rightEye: EyeDetails;
  leftEye: EyeDetails;
  doctor: string;
  notes?: string;
  prescriptionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  _id: string;
  name: string;
  category: Category | string;
  sku: string;
  brand?: string;
  description?: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minimumStock: number;
  status: 'active' | 'inactive';
  stockStatus?: 'In Stock' | 'Low Stock' | 'Out of Stock';
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  _id?: string;
  item: string | Item;
  name: string;
  categoryName?: string;
  sku?: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  discountPercentage: number;
  total: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  customer: Customer | string;
  customerSnapshot: {
    name: string;
    mobile: string;
    alternateMobile?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  includePrescription?: boolean;
  prescription?: Prescription | string;
  prescriptionSnapshot?: {
    rightEye: EyeDetails;
    leftEye: EyeDetails;
    doctor?: string;
    notes?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  overallDiscountType?: 'percentage' | 'fixed';
  overallDiscountValue?: number;
  overallDiscountAmount?: number;
  taxRate?: number;
  tax: number;
  grandTotal: number;
  cashAmount: number;
  onlineAmount: number;
  dueAmount: number;
  paymentStatus: 'Paid' | 'Partial' | 'Due';
  paymentMethod: 'Cash' | 'Online' | 'UPI' | 'Card' | 'Split' | 'Other';
  pdfPath?: string;
  whatsappStatus: 'Pending' | 'Sent' | 'Delivered' | 'Read' | 'Failed' | 'Not Configured';
  whatsappMessageId?: string;
  whatsappError?: string;
  whatsappSentAt?: string;
  notes?: string;
  invoiceDate: string;
  createdAt: string;
  updatedAt: string;
  transactions?: Transaction[];
}

export interface Transaction {
  _id: string;
  transactionId: string;
  invoice: Invoice | string;
  customer: Customer | string;
  paymentType: 'Cash' | 'Online' | 'UPI' | 'Card' | 'Other';
  amount: number;
  referenceNumber?: string;
  status: 'Completed' | 'Pending' | 'Failed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhoneNumber {
  _id: string;
  number: string;
  label: string;
  type: 'Customer' | 'Supplier' | 'Doctor' | 'Other';
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettings {
  _id?: string;
  storeName: string;
  tagline: string;
  logoUrl?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  gstNumber: string;
  invoicePrefix: string;
  invoiceFooter: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
  whatsappAccessToken?: string;
  hasWhatsAppToken?: boolean;
  whatsappAccessTokenMasked?: string;
  currencySymbol: string;
  taxRate: number;
}
