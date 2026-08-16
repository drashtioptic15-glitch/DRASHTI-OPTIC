import crypto from 'crypto';
import { getDB } from '../config/database.js';
import { Query } from './baseQuery.js';

class PhoneNumberModel {
  find(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.type) {
      clauses.push('type = ?');
      params.push(filter.type);
    }
    if (filter.status) {
      clauses.push('status = ?');
      params.push(filter.status);
    }
    if (filter.search || filter.$or) {
      const term = filter.search || (filter.$or ? (filter.$or[0]?.number?.$regex || filter.$or[0]?.label?.$regex || '') : '');
      if (term) {
        clauses.push('(number LIKE ? OR label LIKE ?)');
        const searchPattern = `%${term.replace(/^\^|\$$/g, '').trim()}%`;
        params.push(searchPattern, searchPattern);
      }
    }

    const self = this;
    return new Query(async ({ limit, skip, sort }) => {
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      let sql = `SELECT * FROM phone_numbers ${where}`;

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
      const row = await db.get(`SELECT * FROM phone_numbers WHERE _id = ? LIMIT 1`, [id]);
      return self._wrap(row);
    });
  }

  async findOne(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.number) {
      clauses.push('number = ?');
      params.push(filter.number.trim());
    }
    if (filter._id) {
      clauses.push('_id = ?');
      params.push(filter._id);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT * FROM phone_numbers ${where} LIMIT 1`, params);
    return this._wrap(row);
  }

  async create(data) {
    const db = getDB();
    const id = data._id || crypto.randomBytes(12).toString('hex');
    const now = new Date().toISOString();

    const phone = {
      _id: id,
      number: data.number.trim(),
      label: data.label.trim(),
      type: data.type || 'Customer',
      status: data.status || 'active',
      notes: data.notes ? data.notes.trim() : '',
      createdAt: now,
      updatedAt: now,
    };

    await db.run(
      `INSERT INTO phone_numbers (_id, number, label, type, status, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [phone._id, phone.number, phone.label, phone.type, phone.status, phone.notes, phone.createdAt, phone.updatedAt]
    );

    return this._wrap(phone);
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM phone_numbers WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    const now = new Date().toISOString();
    const setClauses = ['updatedAt = ?'];
    const params = [now];

    if (updates.number !== undefined) {
      setClauses.push('number = ?');
      params.push(updates.number.trim());
    }
    if (updates.label !== undefined) {
      setClauses.push('label = ?');
      params.push(updates.label.trim());
    }
    if (updates.type !== undefined) {
      setClauses.push('type = ?');
      params.push(updates.type);
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      params.push(updates.notes.trim());
    }

    params.push(id);
    await db.run(`UPDATE phone_numbers SET ${setClauses.join(', ')} WHERE _id = ?`, params);
    return await this.findById(id);
  }

  async findByIdAndDelete(id) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM phone_numbers WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    await db.run(`DELETE FROM phone_numbers WHERE _id = ?`, [id]);
    return this._wrap(existing);
  }

  async countDocuments(filter = {}) {
    const db = getDB();
    const row = await db.get(`SELECT COUNT(*) as count FROM phone_numbers`);
    return row ? row.count : 0;
  }

  _wrap(row) {
    if (!row) return null;
    return {
      ...row,
      id: row._id,
    };
  }
}

const PhoneNumber = new PhoneNumberModel();
export default PhoneNumber;
