import crypto from 'crypto';
import { getDB } from '../config/database.js';
import { Query } from './baseQuery.js';
import Customer from './Customer.js';

class PrescriptionModel {
  find(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.customer) {
      clauses.push('customer = ?');
      params.push(typeof filter.customer === 'object' ? filter.customer._id : filter.customer);
    }
    if (filter.doctor) {
      clauses.push('LOWER(doctor) = LOWER(?)');
      params.push(filter.doctor);
    }

    const self = this;
    return new Query(async ({ limit, skip, sort, populate }) => {
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      let sql = `SELECT * FROM prescriptions ${where}`;

      if (sort && typeof sort === 'object') {
        const orderFields = Object.entries(sort)
          .map(([k, v]) => `${k} ${v === -1 || v === 'desc' ? 'DESC' : 'ASC'}`)
          .join(', ');
        if (orderFields) sql += ` ORDER BY ${orderFields}`;
      } else {
        sql += ` ORDER BY prescriptionDate DESC, createdAt DESC`;
      }

      const queryParams = [...params];
      if (limit !== undefined) {
        sql += ` LIMIT ? OFFSET ?`;
        queryParams.push(limit, skip || 0);
      }

      const rows = await db.all(sql, queryParams);
      const items = rows.map((r) => self._wrap(r));

      if (populate && populate.includes('customer')) {
        for (const item of items) {
          if (item.customer) {
            item.customer = await Customer.findById(item.customer);
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
      const row = await db.get(`SELECT * FROM prescriptions WHERE _id = ? LIMIT 1`, [id]);
      if (!row) return null;
      const item = self._wrap(row);

      if (populate && populate.includes('customer') && item.customer) {
        item.customer = await Customer.findById(item.customer);
      }
      return item;
    });
  }

  async findOne(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.customer) {
      clauses.push('customer = ?');
      params.push(typeof filter.customer === 'object' ? filter.customer._id : filter.customer);
    }
    if (filter._id) {
      clauses.push('_id = ?');
      params.push(filter._id);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT * FROM prescriptions ${where} ORDER BY createdAt DESC LIMIT 1`, params);
    if (!row) return null;
    return this._wrap(row);
  }

  async create(data) {
    const db = getDB();
    const id = data._id || crypto.randomBytes(12).toString('hex');
    const now = new Date().toISOString();

    const customerId = typeof data.customer === 'object' ? data.customer._id : data.customer;
    const rightEye = typeof data.rightEye === 'object' ? JSON.stringify(data.rightEye) : (data.rightEye || '{}');
    const leftEye = typeof data.leftEye === 'object' ? JSON.stringify(data.leftEye) : (data.leftEye || '{}');

    const prescription = {
      _id: id,
      customer: customerId,
      rightEye,
      leftEye,
      doctor: data.doctor ? data.doctor.trim() : '',
      notes: data.notes ? data.notes.trim() : '',
      prescriptionDate: data.prescriptionDate ? new Date(data.prescriptionDate).toISOString() : now,
      createdAt: now,
      updatedAt: now,
    };

    await db.run(
      `INSERT INTO prescriptions (_id, customer, rightEye, leftEye, doctor, notes, prescriptionDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prescription._id,
        prescription.customer,
        prescription.rightEye,
        prescription.leftEye,
        prescription.doctor,
        prescription.notes,
        prescription.prescriptionDate,
        prescription.createdAt,
        prescription.updatedAt,
      ]
    );

    return this._wrap(prescription);
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM prescriptions WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    const now = new Date().toISOString();
    const setClauses = ['updatedAt = ?'];
    const params = [now];

    if (updates.customer !== undefined) {
      setClauses.push('customer = ?');
      params.push(typeof updates.customer === 'object' ? updates.customer._id : updates.customer);
    }
    if (updates.rightEye !== undefined) {
      setClauses.push('rightEye = ?');
      params.push(typeof updates.rightEye === 'object' ? JSON.stringify(updates.rightEye) : updates.rightEye);
    }
    if (updates.leftEye !== undefined) {
      setClauses.push('leftEye = ?');
      params.push(typeof updates.leftEye === 'object' ? JSON.stringify(updates.leftEye) : updates.leftEye);
    }
    if (updates.doctor !== undefined) {
      setClauses.push('doctor = ?');
      params.push(updates.doctor.trim());
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      params.push(updates.notes.trim());
    }
    if (updates.prescriptionDate !== undefined) {
      setClauses.push('prescriptionDate = ?');
      params.push(new Date(updates.prescriptionDate).toISOString());
    }

    params.push(id);
    await db.run(`UPDATE prescriptions SET ${setClauses.join(', ')} WHERE _id = ?`, params);
    return await this.findById(id);
  }

  async findByIdAndDelete(id) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM prescriptions WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    await db.run(`DELETE FROM prescriptions WHERE _id = ?`, [id]);
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
    if (filter.customer) {
      clauses.push('customer = ?');
      params.push(typeof filter.customer === 'object' ? filter.customer._id : filter.customer);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT * FROM prescriptions ${where} LIMIT 1`, params);
    if (!row) return { deletedCount: 0 };

    await db.run(`DELETE FROM prescriptions WHERE _id = ?`, [row._id]);
    return { deletedCount: 1 };
  }

  async deleteMany(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.customer) {
      clauses.push('customer = ?');
      params.push(typeof filter.customer === 'object' ? filter.customer._id : filter.customer);
    }
    if (filter.doctor) {
      clauses.push('LOWER(doctor) = LOWER(?)');
      params.push(filter.doctor);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const countRow = await db.get(`SELECT COUNT(*) as count FROM prescriptions ${where}`, params);
    const deletedCount = countRow ? countRow.count : 0;

    await db.run(`DELETE FROM prescriptions ${where}`, params);
    return { deletedCount };
  }

  async countDocuments(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.customer) {
      if (typeof filter.customer === 'object' && filter.customer.$in) {
        if (filter.customer.$in.length === 0) return 0;
        const placeholders = filter.customer.$in.map(() => '?').join(',');
        clauses.push(`customer IN (${placeholders})`);
        params.push(...filter.customer.$in);
      } else {
        clauses.push('customer = ?');
        params.push(typeof filter.customer === 'object' ? filter.customer._id : filter.customer);
      }
    }
    if (filter.doctor) {
      clauses.push('doctor LIKE ?');
      params.push(`%${filter.doctor.trim()}%`);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT COUNT(*) as count FROM prescriptions ${where}`, params);
    return row ? row.count : 0;
  }

  _wrap(row) {
    if (!row) return null;
    let rightEye = {};
    let leftEye = {};
    try {
      rightEye = typeof row.rightEye === 'string' ? JSON.parse(row.rightEye) : (row.rightEye || {});
    } catch {
      rightEye = {};
    }
    try {
      leftEye = typeof row.leftEye === 'string' ? JSON.parse(row.leftEye) : (row.leftEye || {});
    } catch {
      leftEye = {};
    }

    return {
      ...row,
      id: row._id,
      rightEye,
      leftEye,
      toObject() {
        return { ...this };
      },
      async save() {
        return await PrescriptionModel.prototype.findByIdAndUpdate(this._id, this);
      },
    };
  }
}

const Prescription = new PrescriptionModel();
export default Prescription;
