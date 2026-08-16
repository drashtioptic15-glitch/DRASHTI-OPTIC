import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import Item from '../models/Item.js';
import Prescription from '../models/Prescription.js';
import Transaction from '../models/Transaction.js';
import StoreSettings from '../models/StoreSettings.js';
import { generateInvoicePDF } from '../services/pdfService.js';
import { sendInvoiceViaWhatsApp } from '../services/whatsappService.js';
import fs from 'fs';
import path from 'path';

// Helper to build date range from filter presets
export const getDateRange = (filter, customStartDate, customEndDate) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (filter) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;

    case 'this_week':
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
      break;

    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;

    case 'custom':
      if (customStartDate) {
        start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(0);
      }
      if (customEndDate) {
        end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date();
        end.setHours(23, 59, 59, 999);
      }
      break;

    default:
      start = null;
      end = null;
  }

  return { start, end };
};

// @desc    Get all sales/invoices with advanced filters & summary cards
// @route   GET /api/sales
export const getSales = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const {
      search,
      filter,
      startDate,
      endDate,
      paymentStatus,
      paymentMethod,
      customer,
      whatsappStatus,
    } = req.query;

    let query = {};

    // Date filtering
    if (filter) {
      const { start, end } = getDateRange(filter, startDate, endDate);
      if (start && end) {
        query.invoiceDate = { $gte: start, $lte: end };
      }
    }

    // Search query
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
        { 'customerSnapshot.mobile': { $regex: search, $options: 'i' } },
      ];
    }

    if (customer) {
      query.customer = customer;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }

    if (whatsappStatus && whatsappStatus !== 'all') {
      query.whatsappStatus = whatsappStatus;
    }

    // Compute aggregate summary for the filtered set
    const summaryAgg = await Invoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$grandTotal' },
          totalPaid: { $sum: { $add: ['$cashAmount', '$onlineAmount'] } },
          totalDue: { $sum: '$dueAmount' },
          cashTotal: { $sum: '$cashAmount' },
          onlineTotal: { $sum: '$onlineAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = summaryAgg[0] || {
      totalSales: 0,
      totalPaid: 0,
      totalDue: 0,
      cashTotal: 0,
      onlineTotal: 0,
      count: 0,
    };

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('customer', 'customerId name mobile')
      .sort({ invoiceDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: invoices,
      summary,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice by ID
// @route   GET /api/sales/:id
export const getSaleById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('prescription')
      .populate('items.item');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Fetch related transactions
    const transactions = await Transaction.find({ invoice: invoice._id }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        ...invoice.toObject(),
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new sale / invoice (Atomic Fast Billing Engine)
// @route   POST /api/sales
export const createSale = async (req, res, next) => {
  try {
    const {
      customerId,
      customerData, // { name, mobile, alternateMobile, email, address, city, state, pincode }
      prescriptionId,
      prescriptionData, // optional new prescription object
      includePrescription = true, // send prescription number to PDF toggle
      items, // [{ itemId, quantity, unitPrice, discountType, discountValue }]
      overallDiscountType,
      overallDiscountValue,
      taxRate = 0,
      cashAmount = 0,
      onlineAmount = 0,
      paymentMethod = 'Cash',
      notes = '',
      invoiceDate,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item is required in the invoice',
      });
    }

    // 1. Handle Customer (Find & Update all modified fields, or Create)
    let customerDoc = null;

    if (customerId) {
      customerDoc = await Customer.findById(customerId);
      if (!customerDoc) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found with provided ID',
        });
      }

      // If user updated customer name, mobile, address, etc. on sales page, update customer in MongoDB!
      if (customerData) {
        if (customerData.name && customerData.name.trim()) customerDoc.name = customerData.name.trim();
        if (customerData.mobile && customerData.mobile.trim()) customerDoc.mobile = customerData.mobile.trim();
        if (customerData.alternateMobile !== undefined) customerDoc.alternateMobile = customerData.alternateMobile?.trim() || '';
        if (customerData.email !== undefined) customerDoc.email = customerData.email?.trim() || '';
        if (customerData.address !== undefined) customerDoc.address = customerData.address?.trim() || '';
        if (customerData.city !== undefined) customerDoc.city = customerData.city?.trim() || '';
        if (customerData.state !== undefined) customerDoc.state = customerData.state?.trim() || '';
        if (customerData.pincode !== undefined) customerDoc.pincode = customerData.pincode?.trim() || '';
        await customerDoc.save();
      }
    } else if (customerData?.name && customerData?.mobile) {
      // Look up existing by mobile or create new
      customerDoc = await Customer.findOne({ mobile: customerData.mobile.trim() });
      if (!customerDoc) {
        customerDoc = await Customer.create({
          name: customerData.name.trim(),
          mobile: customerData.mobile.trim(),
          alternateMobile: customerData.alternateMobile?.trim() || '',
          email: customerData.email?.trim() || '',
          address: customerData.address?.trim() || '',
          city: customerData.city?.trim() || '',
          state: customerData.state?.trim() || '',
          pincode: customerData.pincode?.trim() || '',
        });
      } else {
        // Update details if provided
        if (customerData.name && customerData.name.trim()) customerDoc.name = customerData.name.trim();
        if (customerData.alternateMobile !== undefined) customerDoc.alternateMobile = customerData.alternateMobile?.trim() || '';
        if (customerData.email !== undefined) customerDoc.email = customerData.email?.trim() || '';
        if (customerData.address !== undefined) customerDoc.address = customerData.address?.trim() || '';
        if (customerData.city !== undefined) customerDoc.city = customerData.city?.trim() || '';
        if (customerData.state !== undefined) customerDoc.state = customerData.state?.trim() || '';
        if (customerData.pincode !== undefined) customerDoc.pincode = customerData.pincode?.trim() || '';
        await customerDoc.save();
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Customer name and mobile number are required',
      });
    }

    // 2. Handle Prescription (Find & Update if modified, or Create)
    let prescriptionDoc = null;
    if (prescriptionId) {
      prescriptionDoc = await Prescription.findById(prescriptionId);
      if (prescriptionDoc && prescriptionData) {
        if (prescriptionData.rightEye) prescriptionDoc.rightEye = prescriptionData.rightEye;
        if (prescriptionData.leftEye) prescriptionDoc.leftEye = prescriptionData.leftEye;
        if (prescriptionData.doctor !== undefined) prescriptionDoc.doctor = prescriptionData.doctor.trim();
        if (prescriptionData.notes !== undefined) prescriptionDoc.notes = prescriptionData.notes.trim();
        if (prescriptionData.prescriptionDate) prescriptionDoc.prescriptionDate = new Date(prescriptionData.prescriptionDate);
        await prescriptionDoc.save();
      }
    } else if (
      prescriptionData &&
      (prescriptionData.rightEye?.sph ||
        prescriptionData.rightEye?.cyl ||
        prescriptionData.rightEye?.axis ||
        prescriptionData.rightEye?.vn ||
        prescriptionData.rightEye?.add ||
        prescriptionData.leftEye?.sph ||
        prescriptionData.leftEye?.cyl ||
        prescriptionData.leftEye?.axis ||
        prescriptionData.leftEye?.vn ||
        prescriptionData.leftEye?.add ||
        prescriptionData.doctor)
    ) {
      prescriptionDoc = await Prescription.create({
        customer: customerDoc._id,
        rightEye: prescriptionData.rightEye || {},
        leftEye: prescriptionData.leftEye || {},
        doctor: prescriptionData.doctor || '',
        notes: prescriptionData.notes || '',
        prescriptionDate: prescriptionData.prescriptionDate || Date.now(),
      });
    }

    // 3. Validate Stock & Calculate Items
    let subtotal = 0;
    let totalItemDiscount = 0;
    const processedItems = [];

    for (const lineItem of items) {
      const itemRecord = await Item.findById(lineItem.itemId || lineItem.item).populate('category');
      if (!itemRecord) {
        return res.status(400).json({
          success: false,
          message: `Product item not found: ${lineItem.itemId}`,
        });
      }

      const qty = Number(lineItem.quantity) || 1;
      const unitPrice = Number(lineItem.unitPrice !== undefined ? lineItem.unitPrice : itemRecord.sellingPrice);
      const itemBaseTotal = unitPrice * qty;

      // Discount calculation per item
      let discAmount = 0;
      let discPercent = 0;
      const dType = lineItem.discountType || 'fixed';
      const dVal = Number(lineItem.discountValue || 0);

      if (dType === 'percentage') {
        discPercent = Math.min(100, Math.max(0, dVal));
        discAmount = (itemBaseTotal * discPercent) / 100;
      } else {
        discAmount = Math.min(itemBaseTotal, Math.max(0, dVal));
        discPercent = itemBaseTotal > 0 ? (discAmount / itemBaseTotal) * 100 : 0;
      }

      const lineTotal = Math.max(0, itemBaseTotal - discAmount);
      subtotal += itemBaseTotal;
      totalItemDiscount += discAmount;

      processedItems.push({
        item: itemRecord._id,
        name: itemRecord.name,
        categoryName: itemRecord.category?.name || '',
        sku: itemRecord.sku,
        brand: itemRecord.brand,
        quantity: qty,
        unitPrice,
        discountType: dType,
        discountValue: dVal,
        discountAmount: discAmount,
        discountPercentage: discPercent,
        total: lineTotal,
      });
    }

    // Overall Discount calculation
    let overallDiscAmount = 0;
    const itemsTotalAfterItemDiscounts = subtotal - totalItemDiscount;
    const ovType = overallDiscountType || 'fixed';
    const ovVal = Number(overallDiscountValue || 0);

    if (ovType === 'percentage') {
      const p = Math.min(100, Math.max(0, ovVal));
      overallDiscAmount = (itemsTotalAfterItemDiscounts * p) / 100;
    } else {
      overallDiscAmount = Math.min(itemsTotalAfterItemDiscounts, Math.max(0, ovVal));
    }

    const netTaxableAmount = Math.max(0, itemsTotalAfterItemDiscounts - overallDiscAmount);
    const taxPercentage = Number(taxRate) || 0;
    const taxAmount = (netTaxableAmount * taxPercentage) / 100;
    const grandTotal = Math.round((netTaxableAmount + taxAmount) * 100) / 100;
    const totalAllDiscounts = totalItemDiscount + overallDiscAmount;

    // 4. Payment Validations
    const cash = Math.max(0, Number(cashAmount) || 0);
    const online = Math.max(0, Number(onlineAmount) || 0);
    const totalPaid = cash + online;

    if (totalPaid > grandTotal) {
      return res.status(400).json({
        success: false,
        message: `Total payment (₹${totalPaid}) cannot exceed the Grand Total (₹${grandTotal})`,
      });
    }

    const dueAmount = Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);
    let paymentStatus = 'Due';
    if (dueAmount === 0) {
      paymentStatus = 'Paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'Partial';
    }

    // 5. Generate Unique Invoice Number
    const invoiceNumber = await Invoice.generateInvoiceNumber();

    // 6. Create Invoice Record
    const newInvoice = await Invoice.create({
      invoiceNumber,
      customer: customerDoc._id,
      customerSnapshot: {
        name: customerDoc.name,
        mobile: customerDoc.mobile,
        alternateMobile: customerDoc.alternateMobile,
        email: customerDoc.email,
        address: customerDoc.address,
        city: customerDoc.city,
        state: customerDoc.state,
        pincode: customerDoc.pincode,
      },
      includePrescription: Boolean(includePrescription),
      prescription: prescriptionDoc?._id || null,
      prescriptionSnapshot: prescriptionDoc
        ? {
            rightEye: prescriptionDoc.rightEye,
            leftEye: prescriptionDoc.leftEye,
            doctor: prescriptionDoc.doctor,
            notes: prescriptionDoc.notes,
          }
        : undefined,
      items: processedItems,
      subtotal,
      totalDiscount: totalAllDiscounts,
      overallDiscountType: ovType,
      overallDiscountValue: ovVal,
      overallDiscountAmount: overallDiscAmount,
      taxRate: taxPercentage,
      tax: taxAmount,
      grandTotal,
      cashAmount: cash,
      onlineAmount: online,
      dueAmount,
      paymentStatus,
      paymentMethod,
      notes,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
    });

    // 7. Update Customer Financial Summary
    customerDoc.totalPurchases += grandTotal;
    customerDoc.totalPaid += totalPaid;
    customerDoc.totalDue += dueAmount;
    customerDoc.lastPurchaseDate = newInvoice.invoiceDate;
    await customerDoc.save();

    // 9. Create Transactions for Payments
    if (cash > 0) {
      const txnId = await Transaction.generateTransactionId();
      await Transaction.create({
        transactionId: txnId,
        invoice: newInvoice._id,
        customer: customerDoc._id,
        paymentType: 'Cash',
        amount: cash,
        status: 'Completed',
        notes: `Cash payment for invoice #${invoiceNumber}`,
      });
    }

    if (online > 0) {
      const txnId = await Transaction.generateTransactionId();
      await Transaction.create({
        transactionId: txnId,
        invoice: newInvoice._id,
        customer: customerDoc._id,
        paymentType: paymentMethod === 'Card' ? 'Card' : paymentMethod === 'UPI' ? 'UPI' : 'Online',
        amount: online,
        status: 'Completed',
        notes: `Online/Digital payment for invoice #${invoiceNumber}`,
      });
    }

    // 10. Generate PDF Invoice on Backend
    const settings = await StoreSettings.findOne();
    let pdfResult = null;
    try {
      pdfResult = await generateInvoicePDF(newInvoice, settings);
      newInvoice.pdfPath = pdfResult.filePath;
      await newInvoice.save();
    } catch (pdfErr) {
      console.error('[PDF Generation Error]', pdfErr);
    }

    // 11. Dispatch PDF to WhatsApp Cloud API Automatically
    let waResult = { status: 'Not Configured' };
    if (pdfResult?.filePath) {
      try {
        waResult = await sendInvoiceViaWhatsApp(newInvoice, pdfResult.filePath);
        newInvoice.whatsappStatus = waResult.status || (waResult.success ? 'Sent' : 'Failed');
        newInvoice.whatsappMessageId = waResult.messageId || '';
        newInvoice.whatsappError = waResult.error || '';
        newInvoice.whatsappSentAt = waResult.sentAt || null;
        await newInvoice.save();
      } catch (waErr) {
        console.error('[WhatsApp Send Error]', waErr);
        newInvoice.whatsappStatus = 'Failed';
        newInvoice.whatsappError = waErr.message;
        await newInvoice.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: newInvoice,
      whatsapp: waResult,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download / Stream Invoice PDF
// @route   GET /api/sales/:id/pdf
export const getInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer').populate('prescription');
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    let filePath = invoice.pdfPath;
    
    // If PDF file doesn't exist on disk, regenerate on demand
    if (!filePath || !fs.existsSync(filePath)) {
      const settings = await StoreSettings.findOne();
      const pdfRes = await generateInvoicePDF(invoice, settings);
      filePath = pdfRes.filePath;
      invoice.pdfPath = filePath;
      await invoice.save();
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Retry / Trigger WhatsApp Invoice dispatch
// @route   POST /api/sales/:id/send-whatsapp
export const sendWhatsAppInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer').populate('prescription');
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    let filePath = invoice.pdfPath;
    if (!filePath || !fs.existsSync(filePath)) {
      const settings = await StoreSettings.findOne();
      const pdfRes = await generateInvoicePDF(invoice, settings);
      filePath = pdfRes.filePath;
      invoice.pdfPath = filePath;
      await invoice.save();
    }

    const waResult = await sendInvoiceViaWhatsApp(invoice, filePath);
    
    invoice.whatsappStatus = waResult.status || (waResult.success ? 'Sent' : 'Failed');
    invoice.whatsappMessageId = waResult.messageId || '';
    invoice.whatsappError = waResult.error || '';
    if (waResult.sentAt) invoice.whatsappSentAt = waResult.sentAt;
    await invoice.save();

    res.status(200).json({
      success: waResult.success,
      message: waResult.success
        ? 'Invoice PDF sent to customer WhatsApp successfully'
        : `WhatsApp dispatch failed: ${waResult.error || 'Check WhatsApp Cloud API settings'}`,
      data: invoice,
      whatsapp: waResult,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete / Cancel Invoice (Restores inventory stock and balances)
// @route   DELETE /api/sales/:id
export const deleteSale = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // 1. Revert Inventory stock
    for (const item of invoice.items) {
      await Item.findByIdAndUpdate(item.item, {
        $inc: { stock: item.quantity },
      });
    }

    // 2. Revert Customer metrics
    const totalPaid = (invoice.cashAmount || 0) + (invoice.onlineAmount || 0);
    await Customer.findByIdAndUpdate(invoice.customer, {
      $inc: {
        totalPurchases: -invoice.grandTotal,
        totalPaid: -totalPaid,
        totalDue: -invoice.dueAmount,
      },
    });

    // 3. Delete linked transactions
    await Transaction.deleteMany({ invoice: invoice._id });

    // 4. Delete PDF file from disk if exists
    if (invoice.pdfPath && fs.existsSync(invoice.pdfPath)) {
      try {
        fs.unlinkSync(invoice.pdfPath);
      } catch (err) {
        console.warn('Could not delete PDF file from disk:', err.message);
      }
    }

    // 5. Delete invoice
    await Invoice.findByIdAndDelete(invoice._id);

    res.status(200).json({
      success: true,
      message: 'Invoice deleted and stock restored successfully',
    });
  } catch (error) {
    next(error);
  }
};
