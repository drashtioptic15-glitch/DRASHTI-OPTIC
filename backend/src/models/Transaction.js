import crypto from 'crypto';
import { getDB } from '../config/database.js';
import { Query } from './baseQuery.js';
import Customer from './Customer.js';
import Invoice from './Invoice.js';

class TransactionModel {
  async generateTransactionId() {
    const db = getDB();
    const currentYear = new Date().getFullYear();
    const prefix = `TXN-${currentYear}-`;

    const lastTxn = await db.get(
      `SELECT transactionId FROM transactions WHERE transactionId LIKE ? ORDER BY createdAt DESC LIMIT 1`,
      [`${prefix}%`]
    );

    if (!lastTxn) {
      return `${prefix}000001`;
    }

    const parts = lastTxn.transactionId.split('-');
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
    if (filter.invoice) {
      clauses.push('invoice = ?');
      params.push(typeof filter.invoice === 'object' ? filter.invoice._id : filter.invoice);
    }
    if (filter.paymentType && filter.paymentType !== 'all') {
      clauses.push('paymentType = ?');
      params.push(filter.paymentType);
    }
    if (filter.status && filter.status !== 'all') {
      clauses.push('status = ?');
      params.push(filter.status);
    }

    const self = this;
    return new Query(async ({ limit, skip, sort, populate }) => {
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      let sql = `SELECT * FROM transactions ${where}`;

      if (sort && typeof sort === 'object') {
        const orderFields = Object.entries(sort)
          .map(([k, v]) => `${k} ${v === -1 || v === 'desc' ? 'DESC' : 'ASC'}`)
          .join(', ');
        if (orderFields) sql += ` ORDER BY ${orderFields}`;
      } else {
        sql += ` ORDER BY createdAt DESC`;
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
          if (populate.includes('invoice') && item.invoice) {
            item.invoice = await Invoice.findById(item.invoice);
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
      const row = await db.get(`SELECT * FROM transactions WHERE _id = ? LIMIT 1`, [id]);
      if (!row) return null;
      const item = self._wrap(row);

      if (populate && populate.length > 0) {
        if (populate.includes('customer') && item.customer) {
          item.customer = await Customer.findById(item.customer);
        }
        if (populate.includes('invoice') && item.invoice) {
          item.invoice = await Invoice.findById(item.invoice);
        }
      }
      return item;
    });
  }

  async create(data) {
    const db = getDB();
    const id = data._id || crypto.randomBytes(12).toString('hex');
    const now = new Date().toISOString();

    let transactionId = data.transactionId;
    if (!transactionId) {
      transactionId = await this.generateTransactionId();
    }

    const customerId = typeof data.customer === 'object' ? data.customer._id : data.customer;
    const invoiceId = typeof data.invoice === 'object' ? data.invoice._id : data.invoice;

    const txn = {
      _id: id,
      transactionId,
      invoice: invoiceId,
      customer: customerId,
      paymentType: data.paymentType || 'Cash',
      amount: Number(data.amount) || 0,
      referenceNumber: data.referenceNumber ? data.referenceNumber.trim() : '',
      status: data.status || 'Completed',
      notes: data.notes ? data.notes.trim() : '',
      createdAt: now,
      updatedAt: now,
    };

    await db.run(
      `INSERT INTO transactions (_id, transactionId, invoice, customer, paymentType, amount, referenceNumber, status, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txn._id,
        txn.transactionId,
        txn.invoice,
        txn.customer,
        txn.paymentType,
        txn.amount,
        txn.referenceNumber,
        txn.status,
        txn.notes,
        txn.createdAt,
        txn.updatedAt,
      ]
    );

    return this._wrap(txn);
  }

  async findOne(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter._id) {
      clauses.push('_id = ?');
      params.push(filter._id);
    }
    if (filter.transactionId) {
      clauses.push('transactionId = ?');
      params.push(filter.transactionId.trim());
    }
    if (filter.invoice) {
      clauses.push('invoice = ?');
      params.push(typeof filter.invoice === 'object' ? filter.invoice._id : filter.invoice);
    }
    if (filter.customer) {
      clauses.push('customer = ?');
      params.push(typeof filter.customer === 'object' ? filter.customer._id : filter.customer);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT * FROM transactions ${where} LIMIT 1`, params);
    if (!row) return null;
    return this._wrap(row);
  }

  async findByIdAndDelete(id) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM transactions WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    await db.run(`DELETE FROM transactions WHERE _id = ?`, [id]);
    return this._wrap(existing);
  }

  async deleteOne(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter._id) {
      clauses.push('_id = ?');
      params.push(filter._id);
    }
    if (filter.transactionId) {
      clauses.push('transactionId = ?');
      params.push(filter.transactionId);
    }
    if (filter.invoice) {
      clauses.push('invoice = ?');
      params.push(typeof filter.invoice === 'object' ? filter.invoice._id : filter.invoice);
    }
    if (filter.customer) {
      clauses.push('customer = ?');
      params.push(typeof filter.customer === 'object' ? filter.customer._id : filter.customer);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT * FROM transactions ${where} LIMIT 1`, params);
    if (!row) return { deletedCount: 0 };

    await db.run(`DELETE FROM transactions WHERE _id = ?`, [row._id]);
    return { deletedCount: 1 };
  }

  async deleteMany(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.invoice) {
      clauses.push('invoice = ?');
      params.push(typeof filter.invoice === 'object' ? filter.invoice._id : filter.invoice);
    }
    if (filter.customer) {
      clauses.push('customer = ?');
      params.push(typeof filter.customer === 'object' ? filter.customer._id : filter.customer);
    }
    if (filter.paymentType && filter.paymentType !== 'all') {
      clauses.push('paymentType = ?');
      params.push(filter.paymentType);
    }
    if (filter.status && filter.status !== 'all') {
      clauses.push('status = ?');
      params.push(filter.status);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const countRow = await db.get(`SELECT COUNT(*) as count FROM transactions ${where}`, params);
    const deletedCount = countRow ? countRow.count : 0;

    await db.run(`DELETE FROM transactions ${where}`, params);
    return { deletedCount };
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM transactions WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    const now = new Date().toISOString();
    const setClauses = ['updatedAt = ?'];
    const params = [now];
    const payload = updates.$set || updates;

    const fields = ['paymentType', 'amount', 'referenceNumber', 'status', 'notes'];
    for (const field of fields) {
      if (payload[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(field === 'amount' ? Number(payload[field]) : payload[field]);
      }
    }

    params.push(id);
    await db.run(`UPDATE transactions SET ${setClauses.join(', ')} WHERE _id = ?`, params);
    return await this.findById(id);
  }

  async countDocuments(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.customer) {
      clauses.push('customer = ?');
      params.push(typeof filter.customer === 'object' ? filter.customer._id : filter.customer);
    }
    if (filter.invoice) {
      clauses.push('invoice = ?');
      params.push(typeof filter.invoice === 'object' ? filter.invoice._id : filter.invoice);
    }
    if (filter.paymentType && filter.paymentType !== 'all') {
      clauses.push('paymentType = ?');
      params.push(filter.paymentType);
    }
    if (filter.status && filter.status !== 'all') {
      clauses.push('status = ?');
      params.push(filter.status);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT COUNT(*) as count FROM transactions ${where}`, params);
    return row ? row.count : 0;
  }

  _wrap(row) {
    if (!row) return null;
    return {
      ...row,
      id: row._id,
      amount: Number(row.amount || 0),
      toObject() {
        return { ...this };
      },
    };
  }
}

const Transaction = new TransactionModel();
export default Transaction;
