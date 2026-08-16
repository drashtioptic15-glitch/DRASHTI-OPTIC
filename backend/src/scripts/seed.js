import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB, { getDB } from '../config/database.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Category from '../models/Category.js';
import Item from '../models/Item.js';
import Prescription from '../models/Prescription.js';
import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
import PhoneNumber from '../models/PhoneNumber.js';
import StoreSettings from '../models/StoreSettings.js';
import { generateInvoicePDF } from '../services/pdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedDatabase = async () => {
  try {
    await connectDB();
    const db = getDB();
    console.log('[SQLite] Connected to database for seeding...');

    // Clear existing tables
    await db.exec(`
      DELETE FROM users;
      DELETE FROM customers;
      DELETE FROM categories;
      DELETE FROM items;
      DELETE FROM prescriptions;
      DELETE FROM invoices;
      DELETE FROM transactions;
      DELETE FROM phone_numbers;
      DELETE FROM store_settings;
    `);
    console.log('🧹 Cleaned existing database tables.');

    // 1. Create Admin
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', salt);
    await User.create({
      name: process.env.ADMIN_NAME || 'Drashti Optic Owner',
      email: (process.env.ADMIN_EMAIL || 'admin@drashtioptic.com').toLowerCase().trim(),
      passwordHash,
      isActive: true,
    });
    console.log('✅ Admin user created');

    // 2. Store Settings
    const settings = await StoreSettings.findOneAndUpdate(
      {},
      {
        storeName: 'Drashti Optic',
        tagline: 'EYEGLASSES | CONTACT LENSES | SUNGLASSES',
        address: 'Shop No. 4, Crystal Plaza, Station Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380001',
        phone: '+91 98765 43210',
        email: 'contact@drashtioptic.com',
        website: 'www.drashtioptic.com',
        gstNumber: '24AAAAA0000A1Z5',
        invoicePrefix: 'INV',
        invoiceFooter:
          'Thank you for choosing Drashti Optic! Goods once sold will be serviced with care. Please carry this invoice for warranty and complimentary adjustments.',
        whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
        whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
        currencySymbol: '₹',
        taxRate: 0,
      }
    );
    console.log('✅ Store Settings created');

    // 3. Categories
    const categoriesData = [
      { name: 'Frames', description: 'Designer optical frames, rimless, full rim, cat-eye and titanium frames' },
      { name: 'Lenses', description: 'Anti-glare, Blue Cut, Progressive, Bifocal and Photochromic ophthalmic lenses' },
      { name: 'Sunglasses', description: 'UV400 Polarized fashion sunglasses and pilot aviators' },
      { name: 'Contact Lenses', description: 'Daily disposables, monthly silicon hydrogel lenses, and colored lenses' },
      { name: 'Accessories & Solutions', description: 'Lens cleaning sprays, anti-fog cloths, luxury cases, chains and eye drops' },
    ];

    const categories = [];
    const catMap = {};
    for (const cData of categoriesData) {
      const cat = await Category.create(cData);
      categories.push(cat);
      catMap[cat.name] = cat._id;
    }
    console.log(`✅ ${categories.length} Categories created`);

    // 4. Products / Items
    const itemsData = [
      { name: 'Titanium Rimless Matte Black', category: catMap['Frames'], sku: 'SKU-00101', brand: 'Titan Eye+', purchasePrice: 1600, sellingPrice: 2800, stock: 18, minimumStock: 4 },
      { name: 'Classic Acetate Square Tortoise', category: catMap['Frames'], sku: 'SKU-00102', brand: 'Ray-Ban', purchasePrice: 2800, sellingPrice: 4800, stock: 12, minimumStock: 3 },
      { name: 'Cat-Eye Gloss Rose Gold', category: catMap['Frames'], sku: 'SKU-00103', brand: 'Vogue', purchasePrice: 2200, sellingPrice: 3900, stock: 8, minimumStock: 3 },
      { name: 'Lightweight TR90 Blue Flex', category: catMap['Frames'], sku: 'SKU-00104', brand: 'Fastrack', purchasePrice: 850, sellingPrice: 1650, stock: 25, minimumStock: 5 },
      { name: 'Drashti Signature Vintage Aviator Frame', category: catMap['Frames'], sku: 'SKU-00105', brand: 'Drashti', purchasePrice: 1200, sellingPrice: 2400, stock: 15, minimumStock: 4 },
      { name: 'Semi-Rimless Clubmaster Gunmetal', category: catMap['Frames'], sku: 'SKU-00106', brand: 'Ray-Ban', purchasePrice: 3100, sellingPrice: 5200, stock: 3, minimumStock: 5 },
      { name: 'Blue Cut Digital Anti-Glare 1.56', category: catMap['Lenses'], sku: 'SKU-00201', brand: 'Crizal Easy', purchasePrice: 700, sellingPrice: 1400, stock: 40, minimumStock: 8 },
      { name: 'Advanced Blue Block UV420 1.61 Hi-Index', category: catMap['Lenses'], sku: 'SKU-00202', brand: 'Essilor Eyezen', purchasePrice: 1400, sellingPrice: 2800, stock: 22, minimumStock: 5 },
      { name: 'Progressive Digital Freeform Varilux', category: catMap['Lenses'], sku: 'SKU-00203', brand: 'Essilor Varilux', purchasePrice: 2900, sellingPrice: 5800, stock: 14, minimumStock: 3 },
      { name: 'Photochromic Transitions Grey 1.56', category: catMap['Lenses'], sku: 'SKU-00204', brand: 'Transitions Gen 8', purchasePrice: 1800, sellingPrice: 3600, stock: 16, minimumStock: 4 },
      { name: 'Ultra Thin Single Vision 1.67 Aspheric', category: catMap['Lenses'], sku: 'SKU-00205', brand: 'Hoya', purchasePrice: 2200, sellingPrice: 4200, stock: 2, minimumStock: 4 },
      { name: 'Aviator Classic Polarized Green Lens', category: catMap['Sunglasses'], sku: 'SKU-00301', brand: 'Ray-Ban', purchasePrice: 3800, sellingPrice: 6500, stock: 7, minimumStock: 2 },
      { name: 'Wayfarer Matte Black Dark Grey Polarized', category: catMap['Sunglasses'], sku: 'SKU-00302', brand: 'Ray-Ban', purchasePrice: 3600, sellingPrice: 6200, stock: 9, minimumStock: 3 },
      { name: 'Hexagonal Flat Lenses Gold/Green', category: catMap['Sunglasses'], sku: 'SKU-00303', brand: 'Vogue', purchasePrice: 2600, sellingPrice: 4400, stock: 5, minimumStock: 2 },
      { name: 'Sport Wrap Shield Polarized Red Mirror', category: catMap['Sunglasses'], sku: 'SKU-00304', brand: 'Oakley', purchasePrice: 4500, sellingPrice: 7900, stock: 0, minimumStock: 2 },
      { name: 'Acuvue Oasys with Hydraclear Plus (6 Pack)', category: catMap['Contact Lenses'], sku: 'SKU-00401', brand: 'Johnson & Johnson', purchasePrice: 1250, sellingPrice: 1950, stock: 30, minimumStock: 6 },
      { name: 'Bausch & Lomb SofLens 59 (6 Pack)', category: catMap['Contact Lenses'], sku: 'SKU-00402', brand: 'Bausch & Lomb', purchasePrice: 750, sellingPrice: 1200, stock: 20, minimumStock: 5 },
      { name: 'Air Optix Plus HydraGlyde Monthly (3 Pack)', category: catMap['Contact Lenses'], sku: 'SKU-00403', brand: 'Alcon', purchasePrice: 950, sellingPrice: 1550, stock: 15, minimumStock: 4 },
      { name: 'FreshLook ColorBlends Monthly (Pure Hazel)', category: catMap['Contact Lenses'], sku: 'SKU-00404', brand: 'Alcon', purchasePrice: 650, sellingPrice: 1100, stock: 12, minimumStock: 3 },
      { name: 'Opti-Clean Premium Lens Spray (100ml)', category: catMap['Accessories & Solutions'], sku: 'SKU-00501', brand: 'Drashti', purchasePrice: 70, sellingPrice: 150, stock: 85, minimumStock: 15 },
      { name: 'Biotrue Multi-Purpose Solution (300ml)', category: catMap['Accessories & Solutions'], sku: 'SKU-00502', brand: 'Bausch & Lomb', purchasePrice: 320, sellingPrice: 480, stock: 35, minimumStock: 8 },
      { name: 'Anti-Fog Microfiber Reusable Cloth Kit', category: catMap['Accessories & Solutions'], sku: 'SKU-00503', brand: 'Drashti', purchasePrice: 90, sellingPrice: 200, stock: 50, minimumStock: 10 },
      { name: 'Leatherette Magnetic Hard Eyewear Case', category: catMap['Accessories & Solutions'], sku: 'SKU-00504', brand: 'Drashti', purchasePrice: 120, sellingPrice: 300, stock: 40, minimumStock: 10 },
    ];

    const items = [];
    for (const iData of itemsData) {
      const itm = await Item.create(iData);
      items.push(itm);
    }
    console.log(`✅ ${items.length} Products/Items created`);

    // 5. Customers
    const customersData = [
      {
        customerId: 'CUST-1001',
        name: 'Markand Rathod',
        mobile: '9876543210',
        alternateMobile: '9876543211',
        email: 'markand@example.com',
        address: 'B-402, Shivalik Heights, Satellite',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380015',
        notes: 'Regular customer. Prefers lightweight titanium frames.',
      },
      {
        customerId: 'CUST-1002',
        name: 'Pooja Patel',
        mobile: '9825123456',
        email: 'pooja.patel@example.com',
        address: '12, Sunrise Park, Bodakdev',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380054',
        notes: 'Computer software engineer. Needs high blue cut protection.',
      },
      {
        customerId: 'CUST-1003',
        name: 'Rajesh Sharma',
        mobile: '9898001122',
        email: 'rajesh.sharma@example.com',
        address: 'Flat 701, Green Acres, Prahlad Nagar',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380015',
        notes: 'Progressive lens user.',
      },
      {
        customerId: 'CUST-1004',
        name: 'Ananya Desai',
        mobile: '9712345678',
        email: 'ananya.d@example.com',
        address: '45, Goyal Intercity, Drive-In Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380052',
        notes: 'Contact lens wearer (monthly disposable).',
      },
      {
        customerId: 'CUST-1005',
        name: 'Vikram Joshi',
        mobile: '9426511223',
        email: 'vjoshi@example.com',
        address: '10, Vasant Vihar, Navrangpura',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380009',
        notes: 'Frequent outdoor travel, polarized sunglasses fan.',
      },
    ];

    const customers = [];
    for (const cData of customersData) {
      const cust = await Customer.create(cData);
      customers.push(cust);
    }
    console.log(`✅ ${customers.length} Customers created`);

    // Prescriptions for customers
    const prescriptionsData = [
      {
        customer: customers[0]._id,
        rightEye: { sph: '-1.75', cyl: '-0.50', axis: '90', add: '+1.25', pd: '31' },
        leftEye: { sph: '-2.00', cyl: '-0.75', axis: '85', add: '+1.25', pd: '31' },
        doctor: 'Dr. A. K. Shah (M.S. Ophth)',
        notes: 'Anti-reflective blue cut lenses recommended for screen use.',
        prescriptionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        customer: customers[1]._id,
        rightEye: { sph: '-1.25', cyl: '-0.25', axis: '180', add: '', pd: '30.5' },
        leftEye: { sph: '-1.50', cyl: '-0.50', axis: '175', add: '', pd: '30.5' },
        doctor: 'Dr. Nita Mehta',
        notes: 'Single vision blue cut lenses.',
        prescriptionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        customer: customers[2]._id,
        rightEye: { sph: '+1.50', cyl: '-0.50', axis: '45', add: '+2.00', pd: '32' },
        leftEye: { sph: '+1.75', cyl: '-0.50', axis: '135', add: '+2.00', pd: '32' },
        doctor: 'Dr. A. K. Shah (M.S. Ophth)',
        notes: 'Varilux progressive lenses advised for distance + reading.',
        prescriptionDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        customer: customers[3]._id,
        rightEye: { sph: '-3.25', cyl: '-0.75', axis: '180', add: '', pd: '31' },
        leftEye: { sph: '-3.50', cyl: '-0.75', axis: '180', add: '', pd: '31' },
        doctor: 'Dr. Parikh Clinic',
        notes: 'Acuvue Oasys contact lenses prescribed.',
        prescriptionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ];

    const prescriptions = [];
    for (const pData of prescriptionsData) {
      const p = await Prescription.create(pData);
      prescriptions.push(p);
    }
    console.log(`✅ ${prescriptions.length} Prescriptions recorded`);

    // 6. Invoices & Transactions
    const invoicesData = [
      {
        invoiceNumber: 'INV-2026-000001',
        customer: customers[0]._id,
        customerSnapshot: {
          name: customers[0].name,
          mobile: customers[0].mobile,
          alternateMobile: customers[0].alternateMobile,
          email: customers[0].email,
          address: customers[0].address,
          city: customers[0].city,
          state: customers[0].state,
          pincode: customers[0].pincode,
        },
        prescription: prescriptions[0]._id,
        prescriptionSnapshot: {
          rightEye: prescriptions[0].rightEye,
          leftEye: prescriptions[0].leftEye,
          doctor: prescriptions[0].doctor,
          notes: prescriptions[0].notes,
        },
        items: [
          {
            item: items[0]._id,
            name: items[0].name,
            categoryName: 'Frames',
            sku: items[0].sku,
            brand: items[0].brand,
            quantity: 1,
            unitPrice: 2800,
            discountType: 'percentage',
            discountValue: 10,
            discountAmount: 280,
            discountPercentage: 10,
            total: 2520,
          },
          {
            item: items[6]._id,
            name: items[6].name,
            categoryName: 'Lenses',
            sku: items[6].sku,
            brand: items[6].brand,
            quantity: 2,
            unitPrice: 1400,
            discountType: 'fixed',
            discountValue: 200,
            discountAmount: 200,
            discountPercentage: 7.14,
            total: 2600,
          },
          {
            item: items[18]._id,
            name: items[18].name,
            categoryName: 'Accessories & Solutions',
            sku: items[18].sku,
            brand: items[18].brand,
            quantity: 1,
            unitPrice: 150,
            discountType: 'fixed',
            discountValue: 0,
            discountAmount: 0,
            discountPercentage: 0,
            total: 150,
          },
        ],
        subtotal: 5750,
        totalDiscount: 480,
        taxRate: 0,
        tax: 0,
        grandTotal: 5270,
        cashAmount: 3000,
        onlineAmount: 2270,
        dueAmount: 0,
        paymentStatus: 'Paid',
        paymentMethod: 'Split',
        whatsappStatus: 'Sent',
        whatsappMessageId: 'wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSQjE0RTY1M0NBQkRDNkU4NkE0AA==',
        invoiceDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        invoiceNumber: 'INV-2026-000002',
        customer: customers[1]._id,
        customerSnapshot: {
          name: customers[1].name,
          mobile: customers[1].mobile,
          email: customers[1].email,
          address: customers[1].address,
          city: customers[1].city,
          state: customers[1].state,
          pincode: customers[1].pincode,
        },
        prescription: prescriptions[1]._id,
        prescriptionSnapshot: {
          rightEye: prescriptions[1].rightEye,
          leftEye: prescriptions[1].leftEye,
          doctor: prescriptions[1].doctor,
          notes: prescriptions[1].notes,
        },
        items: [
          {
            item: items[2]._id,
            name: items[2].name,
            categoryName: 'Frames',
            sku: items[2].sku,
            brand: items[2].brand,
            quantity: 1,
            unitPrice: 3900,
            discountType: 'percentage',
            discountValue: 5,
            discountAmount: 195,
            discountPercentage: 5,
            total: 3705,
          },
          {
            item: items[7]._id,
            name: items[7].name,
            categoryName: 'Lenses',
            sku: items[7].sku,
            brand: items[7].brand,
            quantity: 2,
            unitPrice: 2800,
            discountType: 'fixed',
            discountValue: 300,
            discountAmount: 300,
            discountPercentage: 5.36,
            total: 5300,
          },
        ],
        subtotal: 9500,
        totalDiscount: 495,
        taxRate: 0,
        tax: 0,
        grandTotal: 9005,
        cashAmount: 5000,
        onlineAmount: 0,
        dueAmount: 4005,
        paymentStatus: 'Partial',
        paymentMethod: 'Cash',
        whatsappStatus: 'Delivered',
        whatsappMessageId: 'wamid.HBgMOTE5ODI1MTIzNDU2FQIAERgSQjE0RTY1M0NBQkRDNkU4NkE1AA==',
        invoiceDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        invoiceNumber: 'INV-2026-000003',
        customer: customers[4]._id,
        customerSnapshot: {
          name: customers[4].name,
          mobile: customers[4].mobile,
          email: customers[4].email,
          address: customers[4].address,
          city: customers[4].city,
          state: customers[4].state,
          pincode: customers[4].pincode,
        },
        items: [
          {
            item: items[11]._id,
            name: items[11].name,
            categoryName: 'Sunglasses',
            sku: items[11].sku,
            brand: items[11].brand,
            quantity: 1,
            unitPrice: 6500,
            discountType: 'fixed',
            discountValue: 500,
            discountAmount: 500,
            discountPercentage: 7.69,
            total: 6000,
          },
        ],
        subtotal: 6500,
        totalDiscount: 500,
        taxRate: 0,
        tax: 0,
        grandTotal: 6000,
        cashAmount: 0,
        onlineAmount: 6000,
        dueAmount: 0,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI',
        whatsappStatus: 'Read',
        whatsappMessageId: 'wamid.HBgMOTE5NDI2NTExMjIzFQIAERgSQjE0RTY1M0NBQkRDNkU4NkE2AA==',
        invoiceDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        invoiceNumber: 'INV-2026-000004',
        customer: customers[3]._id,
        customerSnapshot: {
          name: customers[3].name,
          mobile: customers[3].mobile,
          email: customers[3].email,
          address: customers[3].address,
          city: customers[3].city,
          state: customers[3].state,
          pincode: customers[3].pincode,
        },
        prescription: prescriptions[3]._id,
        prescriptionSnapshot: {
          rightEye: prescriptions[3].rightEye,
          leftEye: prescriptions[3].leftEye,
          doctor: prescriptions[3].doctor,
          notes: prescriptions[3].notes,
        },
        items: [
          {
            item: items[15]._id,
            name: items[15].name,
            categoryName: 'Contact Lenses',
            sku: items[15].sku,
            brand: items[15].brand,
            quantity: 2,
            unitPrice: 1950,
            discountType: 'percentage',
            discountValue: 10,
            discountAmount: 390,
            discountPercentage: 10,
            total: 3510,
          },
          {
            item: items[19]._id,
            name: items[19].name,
            categoryName: 'Accessories & Solutions',
            sku: items[19].sku,
            brand: items[19].brand,
            quantity: 1,
            unitPrice: 480,
            discountType: 'fixed',
            discountValue: 30,
            discountAmount: 30,
            discountPercentage: 6.25,
            total: 450,
          },
        ],
        subtotal: 4380,
        totalDiscount: 420,
        taxRate: 0,
        tax: 0,
        grandTotal: 3960,
        cashAmount: 0,
        onlineAmount: 3960,
        dueAmount: 0,
        paymentStatus: 'Paid',
        paymentMethod: 'Card',
        whatsappStatus: 'Sent',
        whatsappMessageId: 'wamid.HBgMOTE5NzEyMzQ1Njc4FQIAERgSQjE0RTY1M0NBQkRDNkU4NkE3AA==',
        invoiceDate: new Date(),
      },
    ];

    const savedInvoices = [];
    for (const invData of invoicesData) {
      const inv = await Invoice.create(invData);
      try {
        const pdfRes = await generateInvoicePDF(inv, settings);
        inv.pdfPath = pdfRes.filePath;
        await inv.save();
      } catch (err) {
        console.warn('PDF generation notice during seed:', err.message);
      }
      savedInvoices.push(inv);
    }
    console.log(`✅ ${savedInvoices.length} Invoices created & PDFs rendered`);

    // Transactions for invoices
    const txnsData = [
      {
        transactionId: 'TXN-2026-000001',
        invoice: savedInvoices[0]._id,
        customer: customers[0]._id,
        paymentType: 'Cash',
        amount: 3000,
        status: 'Completed',
        notes: 'Cash advance on invoice #INV-2026-000001',
        createdAt: savedInvoices[0].invoiceDate,
      },
      {
        transactionId: 'TXN-2026-000002',
        invoice: savedInvoices[0]._id,
        customer: customers[0]._id,
        paymentType: 'UPI',
        amount: 2270,
        referenceNumber: 'UPI/428919028481',
        status: 'Completed',
        notes: 'GPay balance payment on delivery for #INV-2026-000001',
        createdAt: savedInvoices[0].invoiceDate,
      },
      {
        transactionId: 'TXN-2026-000003',
        invoice: savedInvoices[1]._id,
        customer: customers[1]._id,
        paymentType: 'Cash',
        amount: 5000,
        status: 'Completed',
        notes: 'Advance cash payment for #INV-2026-000002',
        createdAt: savedInvoices[1].invoiceDate,
      },
      {
        transactionId: 'TXN-2026-000004',
        invoice: savedInvoices[2]._id,
        customer: customers[4]._id,
        paymentType: 'UPI',
        amount: 6000,
        referenceNumber: 'UPI/983742981023',
        status: 'Completed',
        notes: 'Paytm UPI for Ray-Ban Aviator #INV-2026-000003',
        createdAt: savedInvoices[2].invoiceDate,
      },
      {
        transactionId: 'TXN-2026-000005',
        invoice: savedInvoices[3]._id,
        customer: customers[3]._id,
        paymentType: 'Card',
        amount: 3960,
        referenceNumber: 'POS-HDFC-99382',
        status: 'Completed',
        notes: 'HDFC Credit Card swipe for #INV-2026-000004',
        createdAt: savedInvoices[3].invoiceDate,
      },
    ];

    for (const tData of txnsData) {
      await Transaction.create(tData);
    }
    console.log(`✅ ${txnsData.length} Financial Transactions created`);

    // Update Customer Lifetime Financials
    await Customer.findByIdAndUpdate(customers[0]._id, {
      totalPurchases: 5270,
      totalPaid: 5270,
      totalDue: 0,
      lastPurchaseDate: savedInvoices[0].invoiceDate,
    });

    await Customer.findByIdAndUpdate(customers[1]._id, {
      totalPurchases: 9005,
      totalPaid: 5000,
      totalDue: 4005,
      lastPurchaseDate: savedInvoices[1].invoiceDate,
    });

    await Customer.findByIdAndUpdate(customers[4]._id, {
      totalPurchases: 6000,
      totalPaid: 6000,
      totalDue: 0,
      lastPurchaseDate: savedInvoices[2].invoiceDate,
    });

    await Customer.findByIdAndUpdate(customers[3]._id, {
      totalPurchases: 3960,
      totalPaid: 3960,
      totalDue: 0,
      lastPurchaseDate: savedInvoices[3].invoiceDate,
    });

    // 7. Phone Numbers Directory
    const numbersData = [
      { number: '9876543210', label: 'Markand Rathod', type: 'Customer', status: 'active', notes: 'VIP Customer' },
      { number: '9825123456', label: 'Pooja Patel', type: 'Customer', status: 'active', notes: 'IT Professional' },
      { number: '9898001122', label: 'Rajesh Sharma', type: 'Customer', status: 'active', notes: 'Progressive wear' },
      { number: '9824098765', label: 'Dr. A. K. Shah', type: 'Doctor', status: 'active', notes: 'Senior Consultant Ophthalmologist' },
      { number: '9879100200', label: 'Dr. Nita Mehta', type: 'Doctor', status: 'active', notes: 'Pediatric & Refractive Optometry' },
      { number: '9909012345', label: 'Essilor India Lab Delivery', type: 'Supplier', status: 'active', notes: 'Lens fitting agent' },
      { number: '9825567890', label: 'Luxottica Frame Distributor', type: 'Supplier', status: 'active', notes: 'Ray-Ban & Vogue supply' },
      { number: '9727788990', label: 'Alcon Contact Lens Rep', type: 'Supplier', status: 'active', notes: 'Contact lenses inventory' },
    ];

    for (const nData of numbersData) {
      await PhoneNumber.create(nData);
    }
    console.log(`✅ ${numbersData.length} Phone Directory contacts created`);

    console.log('\n🎉 [SUCCESS] Drashti Optic SQLite Database successfully populated with optical data!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Seed Error]', error);
    process.exit(1);
  }
};

seedDatabase();
