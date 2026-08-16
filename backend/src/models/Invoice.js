import crypto from 'crypto';
import { getDB } from '../config/database.js';
import { Query } from './baseQuery.js';
import Customer from './Customer.js';
import Prescription from './Prescription.js';

class InvoiceModel {
  async generateInvoiceNumber() {
    const db = getDB();
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;

    const lastInvoice = await db.get(
      `SELECT invoiceNumber FROM invoices WHERE invoiceNumber LIKE ? ORDER BY createdAt DESC LIMIT 1`,
      [`${prefix}%`]
    );

    if (!lastInvoice) {
      return `${prefix}000001`;
    }

    const parts = lastInvoice.invoiceNumber.split('-');
    const seqStr = parts[parts.length - 1];
    const nextSeq = parseInt(seqStr, 10) + 1;
    return `${prefix}${String(nextSeq).padStart(6, '0')}`;
  }

  find(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.customer) {
      clauses.push('customer = ?');
      params.push(typeof filter.customer === 'object' ? filter.customer._id : filter.customer);
    }
    if (filter.paymentStatus) {
      clauses.push('paymentStatus = ?');
      params.push(filter.paymentStatus);
    }
    if (filter.search || filter.$or) {
      const term = filter.search || (filter.$or ? (filter.$or[0]?.invoiceNumber?.$regex || '') : '');
      if (term) {
        clauses.push('(invoiceNumber LIKE ? OR customerSnapshot LIKE ?)');
        const searchPattern = `%${term.replace(/^\^|\$$/g, '').trim()}%`;
        params.push(searchPattern, searchPattern);
      }
    }
    if (filter.startDate || filter.invoiceDate?.$gte) {
      clauses.push('invoiceDate >= ?');
      params.push(new Date(filter.startDate || filter.invoiceDate.$gte).toISOString());
    }
    if (filter.endDate || filter.invoiceDate?.$lte) {
      clauses.push('invoiceDate <= ?');
      params.push(new Date(filter.endDate || filter.invoiceDate.$lte).toISOString());
    }

    const self = this;
    return new Query(async ({ limit, skip, sort, populate }) => {
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      let sql = `SELECT * FROM invoices ${where}`;

      if (sort && typeof sort === 'object') {
        const orderFields = Object.entries(sort)
          .map(([k, v]) => `${k} ${v === -1 || v === 'desc' ? 'DESC' : 'ASC'}`)
          .join(', ');
        if (orderFields) sql += ` ORDER BY ${orderFields}`;
      } else {
        sql += ` ORDER BY invoiceDate DESC, createdAt DESC`;
      }

      const queryParams = [...params];
      if (limit !== undefined) {
        sql += ` LIMIT ? OFFSET ?`;
        queryParams.push(limit, skip || 0);
      }

      const rows = await db.all(sql, queryParams);
      const items = rows.map((r) => self._wrap(r));

      if (populate && populate.length > 0) {
        for (const item of items) {
          if (populate.includes('customer') && item.customer) {
            item.customer = await Customer.findById(item.customer);
          }
          if (populate.includes('prescription') && item.prescription) {
            item.prescription = await Prescription.findById(item.prescription);
          }
        }
      }

      return items;
    });
  }

  findById(id) {
    const db = getDB();
    const self = this;
    return new Query(async ({ populate }) => {
      if (!id) return null;
      const row = await db.get(`SELECT * FROM invoices WHERE _id = ? LIMIT 1`, [id]);
      if (!row) return null;
      const item = self._wrap(row);

      if (populate && populate.length > 0) {
        if (populate.includes('customer') && item.customer) {
          item.customer = await Customer.findById(item.customer);
        }
        if (populate.includes('prescription') && item.prescription) {
          item.prescription = await Prescription.findById(item.prescription);
        }
      }
      return item;
    });
  }

  async findOne(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.invoiceNumber) {
      clauses.push('invoiceNumber = ?');
      params.push(filter.invoiceNumber.trim());
    }
    if (filter._id) {
      clauses.push('_id = ?');
      params.push(filter._id);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT * FROM invoices ${where} LIMIT 1`, params);
    if (!row) return null;
    return this._wrap(row);
  }

  async create(data) {
    const db = getDB();
    const id = data._id || crypto.randomBytes(12).toString('hex');
    const now = new Date().toISOString();

    let invoiceNumber = data.invoiceNumber;
    if (!invoiceNumber) {
      invoiceNumber = await this.generateInvoiceNumber();
    }

    const customerId = typeof data.customer === 'object' ? data.customer._id : data.customer;
    const prescriptionId = typeof data.prescription === 'object' ? data.prescription._id : (data.prescription || null);

    const customerSnapshot =
      typeof data.customerSnapshot === 'object' ? JSON.stringify(data.customerSnapshot) : (data.customerSnapshot || '{}');
    const prescriptionSnapshot =
      typeof data.prescriptionSnapshot === 'object' ? JSON.stringify(data.prescriptionSnapshot) : (data.prescriptionSnapshot || '{}');
    const items = typeof data.items === 'object' ? JSON.stringify(data.items) : (data.items || '[]');

    const invoice = {
      _id: id,
      invoiceNumber,
      customer: customerId,
      customerSnapshot,
      includePrescription: data.includePrescription !== undefined ? (data.includePrescription ? 1 : 0) : 1,
      prescription: prescriptionId,
      prescriptionSnapshot,
      items,
      subtotal: Number(data.subtotal) || 0,
      totalDiscount: Number(data.totalDiscount) || 0,
      overallDiscountType: data.overallDiscountType || 'fixed',
      overallDiscountValue: Number(data.overallDiscountValue) || 0,
      overallDiscountAmount: Number(data.overallDiscountAmount) || 0,
      taxRate: Number(data.taxRate) || 0,
      tax: Number(data.tax) || 0,
      grandTotal: Number(data.grandTotal) || 0,
      cashAmount: Number(data.cashAmount) || 0,
      onlineAmount: Number(data.onlineAmount) || 0,
      dueAmount: Number(data.dueAmount) || 0,
      paymentStatus: data.paymentStatus || 'Due',
      paymentMethod: data.paymentMethod || 'Cash',
      pdfPath: data.pdfPath || '',
      whatsappStatus: data.whatsappStatus || 'Pending',
      whatsappMessageId: data.whatsappMessageId || '',
      whatsappError: data.whatsappError || '',
      whatsappSentAt: data.whatsappSentAt || null,
      notes: data.notes ? data.notes.trim() : '',
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate).toISOString() : now,
      createdAt: now,
      updatedAt: now,
    };

    await db.run(
      `INSERT INTO invoices (_id, invoiceNumber, customer, customerSnapshot, includePrescription, prescription, prescriptionSnapshot, items, subtotal, totalDiscount, overallDiscountType, overallDiscountValue, overallDiscountAmount, taxRate, tax, grandTotal, cashAmount, onlineAmount, dueAmount, paymentStatus, paymentMethod, pdfPath, whatsappStatus, whatsappMessageId, whatsappError, whatsappSentAt, notes, invoiceDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice._id,
        invoice.invoiceNumber,
        invoice.customer,
        invoice.customerSnapshot,
        invoice.includePrescription,
        invoice.prescription,
        invoice.prescriptionSnapshot,
        invoice.items,
        invoice.subtotal,
        invoice.totalDiscount,
        invoice.overallDiscountType,
        invoice.overallDiscountValue,
        invoice.overallDiscountAmount,
        invoice.taxRate,
        invoice.tax,
        invoice.grandTotal,
        invoice.cashAmount,
        invoice.onlineAmount,
        invoice.dueAmount,
        invoice.paymentStatus,
        invoice.paymentMethod,
        invoice.pdfPath,
        invoice.whatsappStatus,
        invoice.whatsappMessageId,
        invoice.whatsappError,
        invoice.whatsappSentAt,
        invoice.notes,
        invoice.invoiceDate,
        invoice.createdAt,
        invoice.updatedAt,
      ]
    );

    return this._wrap(invoice);
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM invoices WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    const now = new Date().toISOString();
    const setClauses = ['updatedAt = ?'];
    const params = [now];

    const fields = [
      'customer',
      'customerSnapshot',
      'includePrescription',
      'prescription',
      'prescriptionSnapshot',
      'items',
      'subtotal',
      'totalDiscount',
      'overallDiscountType',
      'overallDiscountValue',
      'overallDiscountAmount',
      'taxRate',
      'tax',
      'grandTotal',
      'cashAmount',
      'onlineAmount',
      'dueAmount',
      'paymentStatus',
      'paymentMethod',
      'pdfPath',
      'whatsappStatus',
      'whatsappMessageId',
      'whatsappError',
      'whatsappSentAt',
      'notes',
      'invoiceDate',
    ];

    for (const field of fields) {
      if (updates[field] !== undefined) {
        let val = updates[field];
        if (field === 'items' && typeof val === 'object') val = JSON.stringify(val);
        if ((field === 'customerSnapshot' || field === 'prescriptionSnapshot') && typeof val === 'object') {
          val = JSON.stringify(val);
        }
        if (field === 'includePrescription') val = val ? 1 : 0;
        setClauses.push(`${field} = ?`);
        params.push(val);
      }
    }

    params.push(id);
    await db.run(`UPDATE invoices SET ${setClauses.join(', ')} WHERE _id = ?`, params);
    return await this.findById(id);
  }

  async findByIdAndDelete(id) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM invoices WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    await db.run(`DELETE FROM invoices WHERE _id = ?`, [id]);
    return this._wrap(existing);
  }

  async countDocuments(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.paymentStatus) {
      clauses.push('paymentStatus = ?');
      params.push(filter.paymentStatus);
    }
    if (filter.startDate || filter.invoiceDate?.$gte) {
      clauses.push('invoiceDate >= ?');
      params.push(new Date(filter.startDate || filter.invoiceDate.$gte).toISOString());
    }
    if (filter.endDate || filter.invoiceDate?.$lte) {
      clauses.push('invoiceDate <= ?');
      params.push(new Date(filter.endDate || filter.invoiceDate.$lte).toISOString());
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT COUNT(*) as count FROM invoices ${where}`, params);
    return row ? row.count : 0;
  }

  _wrap(row) {
    if (!row) return null;
    let items = [];
    let customerSnapshot = {};
    let prescriptionSnapshot = {};

    try {
      items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
    } catch {
      items = [];
    }
    try {
      customerSnapshot = typeof row.customerSnapshot === 'string' ? JSON.parse(row.customerSnapshot) : (row.customerSnapshot || {});
    } catch {
      customerSnapshot = {};
    }
    try {
      prescriptionSnapshot = typeof row.prescriptionSnapshot === 'string' ? JSON.parse(row.prescriptionSnapshot) : (row.prescriptionSnapshot || {});
    } catch {
      prescriptionSnapshot = {};
    }

    return {
      ...row,
      id: row._id,
      items,
      customerSnapshot,
      prescriptionSnapshot,
      includePrescription: Boolean(row.includePrescription),
      subtotal: Number(row.subtotal || 0),
      totalDiscount: Number(row.totalDiscount || 0),
      overallDiscountValue: Number(row.overallDiscountValue || 0),
      overallDiscountAmount: Number(row.overallDiscountAmount || 0),
      taxRate: Number(row.taxRate || 0),
      tax: Number(row.tax || 0),
      grandTotal: Number(row.grandTotal || 0),
      cashAmount: Number(row.cashAmount || 0),
      onlineAmount: Number(row.onlineAmount || 0),
      dueAmount: Number(row.dueAmount || 0),
      async save() {
        return await InvoiceModel.prototype.findByIdAndUpdate(this._id, this);
      },
    };
  }
}

const Invoice = new InvoiceModel();
export default Invoice;
