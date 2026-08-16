import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export const getDB = () => {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return dbInstance;
};

export const connectDB = async () => {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'drashti_optic.sqlite');

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Enable WAL mode for high concurrency
  await dbInstance.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`);

  // Initialize tables
  await createTables(dbInstance);

  console.log(`[SQLite] Database connected: ${dbPath}`);
  return dbInstance;
};

const createTables = async (db) => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      isActive INTEGER DEFAULT 1,
      resetPasswordToken TEXT,
      resetPasswordExpire TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      _id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sku TEXT DEFAULT '',
      brand TEXT DEFAULT '',
      description TEXT DEFAULT '',
      purchasePrice REAL NOT NULL DEFAULT 0,
      sellingPrice REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      minimumStock INTEGER NOT NULL DEFAULT 5,
      status TEXT DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      _id TEXT PRIMARY KEY,
      customerId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      alternateMobile TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      pincode TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      totalPurchases REAL DEFAULT 0,
      totalPaid REAL DEFAULT 0,
      totalDue REAL DEFAULT 0,
      lastPurchaseDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS phone_numbers (
      _id TEXT PRIMARY KEY,
      number TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      type TEXT DEFAULT 'Customer',
      status TEXT DEFAULT 'active',
      notes TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      _id TEXT PRIMARY KEY,
      customer TEXT NOT NULL,
      rightEye TEXT DEFAULT '{}',
      leftEye TEXT DEFAULT '{}',
      doctor TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      prescriptionDate TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      _id TEXT PRIMARY KEY,
      invoiceNumber TEXT UNIQUE NOT NULL,
      customer TEXT NOT NULL,
      customerSnapshot TEXT NOT NULL DEFAULT '{}',
      includePrescription INTEGER DEFAULT 1,
      prescription TEXT,
      prescriptionSnapshot TEXT DEFAULT '{}',
      items TEXT NOT NULL DEFAULT '[]',
      subtotal REAL NOT NULL DEFAULT 0,
      totalDiscount REAL DEFAULT 0,
      overallDiscountType TEXT DEFAULT 'fixed',
      overallDiscountValue REAL DEFAULT 0,
      overallDiscountAmount REAL DEFAULT 0,
      taxRate REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      grandTotal REAL NOT NULL DEFAULT 0,
      cashAmount REAL DEFAULT 0,
      onlineAmount REAL DEFAULT 0,
      dueAmount REAL DEFAULT 0,
      paymentStatus TEXT NOT NULL DEFAULT 'Due',
      paymentMethod TEXT DEFAULT 'Cash',
      pdfPath TEXT DEFAULT '',
      whatsappStatus TEXT DEFAULT 'Pending',
      whatsappMessageId TEXT DEFAULT '',
      whatsappError TEXT DEFAULT '',
      whatsappSentAt TEXT,
      notes TEXT DEFAULT '',
      invoiceDate TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      _id TEXT PRIMARY KEY,
      transactionId TEXT UNIQUE NOT NULL,
      invoice TEXT NOT NULL,
      customer TEXT NOT NULL,
      paymentType TEXT NOT NULL,
      amount REAL NOT NULL,
      referenceNumber TEXT DEFAULT '',
      status TEXT DEFAULT 'Completed',
      notes TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      _id TEXT PRIMARY KEY,
      storeName TEXT DEFAULT 'Drashti Optic',
      tagline TEXT DEFAULT 'EYEGLASSES | CONTACT LENSES | SUNGLASSES',
      logoUrl TEXT DEFAULT '/logo.png',
      address TEXT DEFAULT 'Swaminarayn Chowk',
      city TEXT DEFAULT 'Rajkot',
      state TEXT DEFAULT 'Gujarat',
      pincode TEXT DEFAULT '380001',
      phone TEXT DEFAULT '+91 98765 43210',
      email TEXT DEFAULT 'contact@drashtioptic.com',
      website TEXT DEFAULT 'www.drashtioptic.com',
      gstNumber TEXT DEFAULT '24ABCDE1234F1Z5',
      invoicePrefix TEXT DEFAULT 'INV',
      invoiceFooter TEXT DEFAULT 'Thank you for choosing Drashti Optic! Goods once sold will be serviced with care. Please carry this invoice for warranty and complimentary adjustments.',
      whatsappPhoneNumberId TEXT DEFAULT '',
      whatsappBusinessAccountId TEXT DEFAULT '',
      whatsappAccessToken TEXT DEFAULT '',
      currencySymbol TEXT DEFAULT '₹',
      taxRate REAL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- Create indexes for ultra fast search
    CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_invoices_invoiceNumber ON invoices(invoiceNumber);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoiceDate);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_customer ON prescriptions(customer);
    CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer);
    CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
  `);
};

export default connectDB;
