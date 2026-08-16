import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.AUDIT_URL || 'http://localhost:5000/api';

async function runCompletePageAudit() {
  console.log('\n==================================================================');
  console.log('🔍 DRASHTI OPTIC COMPREHENSIVE MULTI-PAGE & API AUDIT SUITE');
  console.log('==================================================================\n');

  let authToken = '';
  let cookieHeader = '';
  let passedCount = 0;
  let failedCount = 0;

  function pass(name, detail = '') {
    passedCount++;
    console.log(`✅ [PASS] ${name}${detail ? ' -> ' + detail : ''}`);
  }

  function fail(name, error) {
    failedCount++;
    const errMsg = error.response?.data?.message || error.response?.data || error.message;
    console.error(`❌ [FAIL] ${name} -> ${JSON.stringify(errMsg)}`);
  }

  // 1. AUTHENTICATION
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@drashtioptic.com',
      password: 'Admin@123456',
    });
    authToken = loginRes.data.token;
    const rawCookies = loginRes.headers['set-cookie'];
    if (rawCookies) {
      cookieHeader = rawCookies.map((c) => c.split(';')[0]).join('; ');
    }
    pass('Page: /login (Admin Authentication)', `Signed in as ${loginRes.data.data.email}`);
  } catch (err) {
    fail('Page: /login', err);
    process.exit(1);
  }

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${authToken}`,
      Cookie: cookieHeader,
    },
  };

  // 2. AUTH SESSION PROFILE (/api/auth/me)
  try {
    const meRes = await axios.get(`${BASE_URL}/auth/me`, authHeaders);
    pass('Auth Verification (/api/auth/me)', `User: ${meRes.data.data.name} (Role: Store Owner)`);
  } catch (err) {
    fail('Auth Verification', err);
  }

  // 3. DASHBOARD PAGE (/dashboard)
  try {
    const dashRes = await axios.get(`${BASE_URL}/reports/dashboard?chartFilter=this_month`, authHeaders);
    const d = dashRes.data.data;
    pass(
      'Page: /dashboard (Stats & Charts)',
      `Revenue: ₹${d.sales.lifetime} | Customers: ${d.customers.total} | Low Stock: ${d.inventory.lowStock}`
    );
  } catch (err) {
    fail('Page: /dashboard', err);
  }

  // 4. CATEGORIES PAGE (/categories)
  let testCategoryId = null;
  try {
    const catList = await axios.get(`${BASE_URL}/categories`, authHeaders);
    pass('Page: /categories (List)', `Loaded ${catList.data.data.length} categories`);

    // Create Category test
    const newCat = await axios.post(
      `${BASE_URL}/categories`,
      { name: `Audit Test Category ${Date.now()}`, description: 'Test category' },
      authHeaders
    );
    testCategoryId = newCat.data.data._id;
    pass('Page: /categories (Create)', `Created category: ${newCat.data.data.name}`);

    // Update Category test
    await axios.put(`${BASE_URL}/categories/${testCategoryId}`, { description: 'Updated test description' }, authHeaders);
    pass('Page: /categories (Update)', `Updated category: ${testCategoryId}`);

    // Delete Category test
    await axios.delete(`${BASE_URL}/categories/${testCategoryId}`, authHeaders);
    pass('Page: /categories (Delete)', `Deleted category: ${testCategoryId}`);
  } catch (err) {
    fail('Page: /categories', err);
  }

  // 5. INVENTORY ITEMS PAGE (/items)
  let testItemId = null;
  try {
    const itemsRes = await axios.get(`${BASE_URL}/items?limit=20`, authHeaders);
    pass('Page: /items (List & Stock Filter)', `Loaded ${itemsRes.data.data.length} items`);

    // Create item
    const newItem = await axios.post(
      `${BASE_URL}/items`,
      {
        name: `Audit Frame ${Date.now()}`,
        sku: `SKU-TEST-${Date.now().toString().slice(-4)}`,
        brand: 'Ray-Ban',
        purchasePrice: 1500,
        sellingPrice: 3200,
        stock: 15,
        minimumStock: 3,
      },
      authHeaders
    );
    testItemId = newItem.data.data._id;
    pass('Page: /items (Create Item)', `Created item: ${newItem.data.data.name} (SKU: ${newItem.data.data.sku})`);

    // Get item by ID
    const singleItem = await axios.get(`${BASE_URL}/items/${testItemId}`, authHeaders);
    pass('Page: /items (Item Details)', `Retrieved item: ${singleItem.data.data.name}`);

    // Update item
    await axios.put(`${BASE_URL}/items/${testItemId}`, { stock: 14, sellingPrice: 3100 }, authHeaders);
    pass('Page: /items (Update Item)', `Updated stock to 14 units`);

    // Delete item
    await axios.delete(`${BASE_URL}/items/${testItemId}`, authHeaders);
    pass('Page: /items (Delete Item)', `Deleted item: ${testItemId}`);
  } catch (err) {
    fail('Page: /items', err);
  }

  // 6. CUSTOMERS PAGE (/customers & /customers/[id])
  let testCustomerId = null;
  try {
    const custRes = await axios.get(`${BASE_URL}/customers?limit=20`, authHeaders);
    pass('Page: /customers (List)', `Loaded ${custRes.data.data.length} customers`);

    // Create customer
    const newCust = await axios.post(
      `${BASE_URL}/customers`,
      {
        name: `Audit Customer ${Date.now().toString().slice(-4)}`,
        mobile: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        email: `customer${Date.now()}@example.com`,
        address: '123 Optical Market, Ahmedabad',
      },
      authHeaders
    );
    testCustomerId = newCust.data.data._id;
    pass('Page: /customers (Create Customer)', `Created: ${newCust.data.data.name} (${newCust.data.data.customerId})`);

    // Customer search autocomplete
    const searchRes = await axios.get(`${BASE_URL}/customers/search?query=${newCust.data.data.name.slice(0, 8)}`, authHeaders);
    pass('Page: /customers (Autocomplete)', `Found ${searchRes.data.data.length} match(es) for search`);

    // Customer profile with invoices & prescriptions (/customers/[id])
    const singleCust = await axios.get(`${BASE_URL}/customers/${testCustomerId}`, authHeaders);
    pass('Page: /customers/[id] (Full Profile)', `Loaded profile with ${singleCust.data.data.invoices?.length || 0} invoices`);
  } catch (err) {
    fail('Page: /customers', err);
  }

  // 7. PRESCRIPTIONS PAGE (/prescriptions)
  let testPrescriptionId = null;
  try {
    const prescList = await axios.get(`${BASE_URL}/prescriptions`, authHeaders);
    pass('Page: /prescriptions (List)', `Loaded ${prescList.data.data.length} prescription records`);

    // Create prescription
    const newPresc = await axios.post(
      `${BASE_URL}/prescriptions`,
      {
        customer: testCustomerId,
        rightEye: { sph: '-1.50', cyl: '-0.50', axis: '90', add: '+1.50', pd: '31' },
        leftEye: { sph: '-1.75', cyl: '-0.25', axis: '85', add: '+1.50', pd: '31' },
        doctor: 'Dr. Shah',
        notes: 'Progressive lens',
      },
      authHeaders
    );
    testPrescriptionId = newPresc.data.data._id;
    pass('Page: /prescriptions (Create)', `Created prescription: ${testPrescriptionId}`);
  } catch (err) {
    fail('Page: /prescriptions', err);
  }

  // 8. FAST BILLING & INVOICES (/sales/add, /sales, /sales/[id])
  let createdInvoiceId = null;
  try {
    const itemsList = (await axios.get(`${BASE_URL}/items?limit=5`, authHeaders)).data.data;
    const sampleItem = itemsList[0];

    const salePayload = {
      customerId: testCustomerId,
      customerData: {
        name: 'Audit Customer',
        mobile: '9876543210',
      },
      prescriptionData: {
        rightEye: { sph: '-1.50', cyl: '-0.50', axis: '90', add: '+1.50', pd: '31' },
        leftEye: { sph: '-1.75', cyl: '-0.25', axis: '85', add: '+1.50', pd: '31' },
        doctor: 'Dr. Mehta',
      },
      items: [
        {
          itemId: sampleItem._id,
          quantity: 1,
          unitPrice: sampleItem.sellingPrice,
          discountType: 'fixed',
          discountValue: 50,
        },
      ],
      overallDiscountType: 'fixed',
      overallDiscountValue: 50,
      taxRate: 0,
      cashAmount: 100,
      onlineAmount: 0,
      paymentMethod: 'Cash',
      notes: 'Audit Counter Billing Test',
    };

    const saleRes = await axios.post(`${BASE_URL}/sales`, salePayload, authHeaders);
    createdInvoiceId = saleRes.data.data._id;
    pass(
      'Page: /sales/add (Fast Billing Engine)',
      `Invoice Generated: ${saleRes.data.data.invoiceNumber} (Total: ₹${saleRes.data.data.grandTotal})`
    );

    // List sales
    const salesList = await axios.get(`${BASE_URL}/sales`, authHeaders);
    pass('Page: /sales (Invoice List)', `Loaded ${salesList.data.data.length} invoices`);

    // Single invoice details (/sales/[id])
    const singleInv = await axios.get(`${BASE_URL}/sales/${createdInvoiceId}`, authHeaders);
    pass('Page: /sales/[id] (Invoice Details)', `Invoice ${singleInv.data.data.invoiceNumber} with transactions`);
  } catch (err) {
    fail('Page: /sales', err);
  }

  // 9. FINANCIAL LEDGER (/transactions)
  try {
    const txnRes = await axios.get(`${BASE_URL}/transactions`, authHeaders);
    pass(
      'Page: /transactions (Ledger & Summary)',
      `Total Txns: ${txnRes.data.pagination.total} | Volume: ₹${txnRes.data.summary.totalAmount}`
    );
  } catch (err) {
    fail('Page: /transactions', err);
  }

  // 10. ADVANCED REPORTS (/reports)
  try {
    const salesRep = await axios.get(`${BASE_URL}/reports/sales?filter=this_month`, authHeaders);
    const prodRep = await axios.get(`${BASE_URL}/reports/products`, authHeaders);
    pass(
      'Page: /reports (Sales & Inventory Analytics)',
      `Month Sales: ₹${salesRep.data.data.totals.grandTotal} | Top Selling Items: ${prodRep.data.data.topSelling?.length || 0}`
    );
  } catch (err) {
    fail('Page: /reports', err);
  }

  // 11. PHONE DIRECTORY (/numbers)
  let testNumId = null;
  try {
    const numList = await axios.get(`${BASE_URL}/numbers`, authHeaders);
    pass('Page: /numbers (Directory List)', `Loaded ${numList.data.data.length} directory contacts`);

    const newNum = await axios.post(
      `${BASE_URL}/numbers`,
      {
        label: 'Apex Lens Lab',
        number: '9876500000',
        type: 'Supplier/Lab',
        notes: 'Emergency lens cutting',
      },
      authHeaders
    );
    testNumId = newNum.data.data._id;
    pass('Page: /numbers (Create Contact)', `Created: ${newNum.data.data.label}`);

    await axios.delete(`${BASE_URL}/numbers/${testNumId}`, authHeaders);
    pass('Page: /numbers (Delete Contact)', `Deleted contact: ${testNumId}`);
  } catch (err) {
    fail('Page: /numbers', err);
  }

  // 12. STORE SETTINGS (/settings)
  try {
    const settRes = await axios.get(`${BASE_URL}/settings`, authHeaders);
    pass('Page: /settings (Get Store Identity)', `Store: ${settRes.data.data.storeName} | GST: ${settRes.data.data.gstNumber}`);

    await axios.put(
      `${BASE_URL}/settings`,
      {
        storeName: 'Drashti Optic',
        tagline: 'EYEGLASSES | CONTACT LENSES | SUNGLASSES',
      },
      authHeaders
    );
    pass('Page: /settings (Update Profile)', `Updated store settings successfully`);
  } catch (err) {
    fail('Page: /settings', err);
  }

  console.log('\n==================================================================');
  console.log(`📊 AUDIT COMPLETE: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log('==================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runCompletePageAudit();
