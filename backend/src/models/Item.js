import crypto from 'crypto';
import { getDB } from '../config/database.js';
import { Query } from './baseQuery.js';
import Category from './Category.js';

class ItemModel {
  find(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.category) {
      clauses.push('category = ?');
      params.push(typeof filter.category === 'object' ? filter.category._id : filter.category);
    }
    if (filter.status) {
      clauses.push('status = ?');
      params.push(filter.status);
    }
    if (filter.brand) {
      clauses.push('LOWER(brand) = LOWER(?)');
      params.push(filter.brand);
    }
    if (filter.lowStock || filter.$expr) {
      clauses.push('stock <= minimumStock');
    }
    if (filter.search || filter.$or) {
      const term = filter.search || (filter.$or ? (filter.$or[0]?.name?.$regex || filter.$or[0]?.brand?.$regex || filter.$or[0]?.sku?.$regex || '') : '');
      if (term) {
        clauses.push('(name LIKE ? OR brand LIKE ? OR sku LIKE ?)');
        const pattern = `%${term.replace(/^\^|\$$/g, '').trim()}%`;
        params.push(pattern, pattern, pattern);
      }
    }

    const self = this;
    return new Query(async ({ limit, skip, sort, populate }) => {
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      let sql = `SELECT * FROM items ${where}`;

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
      const items = rows.map((r) => self._wrap(r));

      if (populate && populate.includes('category')) {
        for (const item of items) {
          if (item.category) {
            item.category = await Category.findById(item.category);
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
      const row = await db.get(`SELECT * FROM items WHERE _id = ? LIMIT 1`, [id]);
      if (!row) return null;
      const item = self._wrap(row);

      if (populate && populate.includes('category') && item.category) {
        item.category = await Category.findById(item.category);
      }
      return item;
    });
  }

  async findOne(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.sku) {
      clauses.push('sku = ?');
      params.push(filter.sku);
    }
    if (filter.name) {
      clauses.push('LOWER(name) = LOWER(?)');
      params.push(filter.name);
    }
    if (filter._id) {
      clauses.push('_id = ?');
      params.push(filter._id);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT * FROM items ${where} LIMIT 1`, params);
    if (!row) return null;
    return this._wrap(row);
  }

  async create(data) {
    const db = getDB();
    const id = data._id || crypto.randomBytes(12).toString('hex');
    const now = new Date().toISOString();

    const item = {
      _id: id,
      name: data.name.trim(),
      category: typeof data.category === 'object' ? data.category._id : data.category,
      sku: data.sku ? data.sku.trim() : '',
      brand: data.brand ? data.brand.trim() : '',
      description: data.description ? data.description.trim() : '',
      purchasePrice: Number(data.purchasePrice) || 0,
      sellingPrice: Number(data.sellingPrice) || 0,
      stock: Number(data.stock) || 0,
      minimumStock: Number(data.minimumStock) || 5,
      status: data.status || 'active',
      createdAt: now,
      updatedAt: now,
    };

    await db.run(
      `INSERT INTO items (_id, name, category, sku, brand, description, purchasePrice, sellingPrice, stock, minimumStock, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item._id,
        item.name,
        item.category,
        item.sku,
        item.brand,
        item.description,
        item.purchasePrice,
        item.sellingPrice,
        item.stock,
        item.minimumStock,
        item.status,
        item.createdAt,
        item.updatedAt,
      ]
    );

    return this._wrap(item);
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM items WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    const now = new Date().toISOString();
    const setClauses = ['updatedAt = ?'];
    const params = [now];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name.trim());
    }
    if (updates.category !== undefined) {
      setClauses.push('category = ?');
      params.push(typeof updates.category === 'object' ? updates.category._id : updates.category);
    }
    if (updates.sku !== undefined) {
      setClauses.push('sku = ?');
      params.push(updates.sku.trim());
    }
    if (updates.brand !== undefined) {
      setClauses.push('brand = ?');
      params.push(updates.brand.trim());
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      params.push(updates.description.trim());
    }
    if (updates.purchasePrice !== undefined) {
      setClauses.push('purchasePrice = ?');
      params.push(Number(updates.purchasePrice));
    }
    if (updates.sellingPrice !== undefined) {
      setClauses.push('sellingPrice = ?');
      params.push(Number(updates.sellingPrice));
    }
    if (updates.stock !== undefined) {
      setClauses.push('stock = ?');
      params.push(Number(updates.stock));
    }
    if (updates.minimumStock !== undefined) {
      setClauses.push('minimumStock = ?');
      params.push(Number(updates.minimumStock));
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }

    params.push(id);
    await db.run(`UPDATE items SET ${setClauses.join(', ')} WHERE _id = ?`, params);
    return await this.findById(id);
  }

  async findByIdAndDelete(id) {
    const db = getDB();
    const existing = await db.get(`SELECT * FROM items WHERE _id = ? LIMIT 1`, [id]);
    if (!existing) return null;

    await db.run(`DELETE FROM items WHERE _id = ?`, [id]);
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
    if (filter.category) {
      clauses.push('category = ?');
      params.push(filter.category);
    }
    if (filter.stock && typeof filter.stock === 'object' && filter.stock.$lte !== undefined) {
      clauses.push('stock <= ?');
      params.push(filter.stock.$lte);
    }
    if (filter.$expr) {
      clauses.push('stock > 0 AND stock <= minimumStock');
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT COUNT(*) as count FROM items ${where}`, params);
    return row ? row.count : 0;
  }

  _wrap(row) {
    if (!row) return null;
    const stockStatus = row.stock <= 0 ? 'Out of Stock' : (row.stock <= row.minimumStock ? 'Low Stock' : 'In Stock');
    return {
      ...row,
      id: row._id,
      purchasePrice: Number(row.purchasePrice),
      sellingPrice: Number(row.sellingPrice),
      stock: Number(row.stock),
      minimumStock: Number(row.minimumStock),
      stockStatus,
      async save() {
        return await ItemModel.prototype.findByIdAndUpdate(this._id, this);
      },
    };
  }
}

const Item = new ItemModel();
export default Item;
