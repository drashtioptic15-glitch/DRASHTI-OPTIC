import crypto from 'crypto';
import { getDB } from '../config/database.js';
import { Query } from './baseQuery.js';

class CustomerModel {
  find(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.search || filter.$or) {
      const term = filter.search || (filter.$or ? (filter.$or[0]?.name?.$regex || filter.$or[0]?.mobile?.$regex || '') : '');
      if (term) {
        clauses.push('(name LIKE ? OR mobile LIKE ? OR alternateMobile LIKE ? OR customerId LIKE ?)');
        const searchPattern = `%${term.replace(/^\^|\$$/g, '').trim()}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
    }
    if (filter.mobile) {
      clauses.push('mobile = ?');
      params.push(filter.mobile.trim());
    }
    if (filter.customerId) {
      clauses.push('customerId = ?');
      params.push(filter.customerId.trim());
    }

    const self = this;
    return new Query(async ({ limit, skip, sort }) => {
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      let sql = `SELECT * FROM customers ${where}`;

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
      return rows.map((r) => self._wrap(r));
    });
  }

  findById(id) {
    const db = getDB();
    const self = this;
    return new Query(async () => {
      if (!id) return null;
      const row = await db.get(`SELECT * FROM customers WHERE _id = ? LIMIT 1`, [id]);
      return self._wrap(row);
    });
  }

  async findOne(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.mobile) {
      clauses.push('mobile = ?');
      params.push(filter.mobile.trim());
    }
    if (filter.customerId) {
      clauses.push('customerId = ?');
      params.push(filter.customerId.trim());
    }
    if (filter._id) {
      clauses.push('_id = ?');
      params.push(filter._id);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT * FROM customers ${where} LIMIT 1`, params);
    return this._wrap(row);
  }

  async create(data) {
    const db = getDB();
    const id = data._id || crypto.randomBytes(12).toString('hex');
    const now = new Date().toISOString();

    let customerId = data.customerId;
    if (!customerId) {
      const countRow = await db.get(`SELECT COUNT(*) as count FROM customers`);
      const count = (countRow ? countRow.count : 0) + 1;
      customerId = `CUST-${String(count).padStart(4, '0')}`;
    }

    const customer = {
      _id: id,
      customerId,
      name: data.name.trim(),
      mobile: data.mobile.trim(),
      alternateMobile: data.alternateMobile ? data.alternateMobile.trim() : '',
      email: data.email ? data.email.toLowerCase().trim() : '',
      address: data.address ? data.address.trim() : '',
      city: data.city ? data.city.trim() : '',
      state: data.state ? data.state.trim() : '',
      pincode: data.pincode ? data.pincode.trim() : '',
      notes: data.notes ? data.notes.trim() : '',
      totalPurchases: Number(data.totalPurchases) || 0,
      totalPaid: Number(data.totalPaid) || 0,
      totalDue: Number(data.totalDue) || 0,
      lastPurchaseDate: data.lastPurchaseDate || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.run(
      `INSERT INTO customers (_id, customerId, name, mobile, alternateMobile, email, address, city, state, pincode, notes, totalPurchases, totalPaid, totalDue, lastPurchaseDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer._id,
        customer.customerId,
        customer.name,
        customer.mobile,
        customer.alternateMobile,
        customer.email,
        customer.address,
        customer.city,
        customer.state,
        customer.pincode,
        customer.notes,
        customer.totalPurchases,
        customer.totalPaid,
        customer.totalDue,
        customer.lastPurchaseDate,
        customer.createdAt,
        customer.updatedAt,
      ]
    );

    return this._wrap(customer);
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM customers WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    const now = new Date().toISOString();
    const setClauses = ['updatedAt = ?'];
    const params = [now];

    const fields = [
      'name',
      'mobile',
      'alternateMobile',
      'email',
      'address',
      'city',
      'state',
      'pincode',
      'notes',
      'totalPurchases',
      'totalPaid',
      'totalDue',
      'lastPurchaseDate',
    ];

    for (const field of fields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }

    params.push(id);
    await db.run(`UPDATE customers SET ${setClauses.join(', ')} WHERE _id = ?`, params);
    return await this.findById(id);
  }

  async findByIdAndDelete(id) {
    const db = getDB();
    const existing = await this.findById(id);
    if (!existing) return null;

    await db.run(`DELETE FROM customers WHERE _id = ?`, [id]);
    return existing;
  }

  async countDocuments(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.search || filter.$or) {
      const term = filter.search || (filter.$or ? (filter.$or[0]?.name?.$regex || filter.$or[0]?.mobile?.$regex || '') : '');
      if (term) {
        clauses.push('(name LIKE ? OR mobile LIKE ? OR alternateMobile LIKE ? OR customerId LIKE ?)');
        const searchPattern = `%${term.replace(/^\^|\$$/g, '').trim()}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT COUNT(*) as count FROM customers ${where}`, params);
    return row ? row.count : 0;
  }

  _wrap(row) {
    if (!row) return null;
    return {
      ...row,
      id: row._id,
      totalPurchases: Number(row.totalPurchases || 0),
      totalPaid: Number(row.totalPaid || 0),
      totalDue: Number(row.totalDue || 0),
      toObject() {
        return { ...this };
      },
      async save() {
        return await CustomerModel.prototype.findByIdAndUpdate(this._id, this);
      },
    };
  }
}

const Customer = new CustomerModel();
export default Customer;
