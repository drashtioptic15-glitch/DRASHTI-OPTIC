import crypto from 'crypto';
import { getDB } from '../config/database.js';
import { Query } from './baseQuery.js';

class CategoryModel {
  find(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.status) {
      clauses.push('status = ?');
      params.push(filter.status);
    }
    if (filter.name) {
      clauses.push('LOWER(name) = LOWER(?)');
      params.push(filter.name);
    }

    const self = this;
    return new Query(async ({ limit, skip, sort }) => {
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      let sql = `SELECT * FROM categories ${where}`;

      if (sort && typeof sort === 'object') {
        const orderFields = Object.entries(sort)
          .map(([k, v]) => `${k} ${v === -1 || v === 'desc' ? 'DESC' : 'ASC'}`)
          .join(', ');
        if (orderFields) sql += ` ORDER BY ${orderFields}`;
      } else {
        sql += ` ORDER BY name ASC`;
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
      const row = await db.get(`SELECT * FROM categories WHERE _id = ? LIMIT 1`, [id]);
      return self._wrap(row);
    });
  }

  async findOne(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.name) {
      clauses.push('LOWER(name) = LOWER(?)');
      params.push(filter.name.trim());
    }
    if (filter._id) {
      clauses.push('_id = ?');
      params.push(filter._id);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT * FROM categories ${where} LIMIT 1`, params);
    return this._wrap(row);
  }

  async create(data) {
    const db = getDB();
    const id = data._id || crypto.randomBytes(12).toString('hex');
    const now = new Date().toISOString();

    const cat = {
      _id: id,
      name: data.name.trim(),
      description: data.description ? data.description.trim() : '',
      status: data.status || 'active',
      createdAt: now,
      updatedAt: now,
    };

    await db.run(
      `INSERT INTO categories (_id, name, description, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cat._id, cat.name, cat.description, cat.status, cat.createdAt, cat.updatedAt]
    );

    return this._wrap(cat);
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM categories WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    const now = new Date().toISOString();
    const setClauses = ['updatedAt = ?'];
    const params = [now];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name.trim());
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      params.push(updates.description.trim());
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }

    params.push(id);
    await db.run(`UPDATE categories SET ${setClauses.join(', ')} WHERE _id = ?`, params);
    return await this.findById(id);
  }

  async findByIdAndDelete(id) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM categories WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    await db.run(`DELETE FROM categories WHERE _id = ?`, [id]);
    return this._wrap(existing);
  }

  async countDocuments(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.status) {
      clauses.push('status = ?');
      params.push(filter.status);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT COUNT(*) as count FROM categories ${where}`, params);
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

const Category = new CategoryModel();
export default Category;
