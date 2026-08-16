import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDB } from '../config/database.js';

class UserModel {
  async findOne(filter = {}) {
    const db = getDB();
    const clauses = [];
    const params = [];

    if (filter.email) {
      clauses.push('LOWER(email) = LOWER(?)');
      params.push(filter.email.trim());
    }
    if (filter.resetPasswordToken) {
      clauses.push('resetPasswordToken = ?');
      params.push(filter.resetPasswordToken);
    }
    if (filter._id) {
      clauses.push('_id = ?');
      params.push(filter._id);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const row = await db.get(`SELECT * FROM users ${where} LIMIT 1`, params);
    if (!row) return null;
    return this._wrap(row);
  }

  findById(id) {
    const db = getDB();
    const self = this;
    const fetchUser = async () => {
      const row = await db.get(`SELECT * FROM users WHERE _id = ? LIMIT 1`, [id]);
      if (!row) return null;
      return self._wrap(row);
    };

    return {
      select(fields) {
        return this;
      },
      then(resolve, reject) {
        return fetchUser().then(resolve, reject);
      },
    };
  }

  async create(data) {
    const db = getDB();
    const id = data._id || crypto.randomBytes(12).toString('hex');
    const now = new Date().toISOString();

    const user = {
      _id: id,
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      isActive: data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      resetPasswordToken: data.resetPasswordToken || null,
      resetPasswordExpire: data.resetPasswordExpire || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.run(
      `INSERT INTO users (_id, name, email, passwordHash, isActive, resetPasswordToken, resetPasswordExpire, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user._id,
        user.name,
        user.email,
        user.passwordHash,
        user.isActive,
        user.resetPasswordToken,
        user.resetPasswordExpire,
        user.createdAt,
        user.updatedAt,
      ]
    );

    return this._wrap(user);
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    const db = getDB();
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const setClauses = ['updatedAt = ?'];
    const params = [now];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name);
    }
    if (updates.email !== undefined) {
      setClauses.push('email = ?');
      params.push(updates.email.toLowerCase().trim());
    }
    if (updates.passwordHash !== undefined) {
      setClauses.push('passwordHash = ?');
      params.push(updates.passwordHash);
    }
    if (updates.isActive !== undefined) {
      setClauses.push('isActive = ?');
      params.push(updates.isActive ? 1 : 0);
    }
    if (updates.resetPasswordToken !== undefined) {
      setClauses.push('resetPasswordToken = ?');
      params.push(updates.resetPasswordToken);
    }
    if (updates.resetPasswordExpire !== undefined) {
      setClauses.push('resetPasswordExpire = ?');
      params.push(updates.resetPasswordExpire);
    }

    params.push(id);
    await db.run(`UPDATE users SET ${setClauses.join(', ')} WHERE _id = ?`, params);
    return await this.findById(id);
  }

  _wrap(row) {
    if (!row) return null;
    return {
      ...row,
      id: row._id,
      isActive: Boolean(row.isActive),
      async comparePassword(candidatePassword) {
        return await bcrypt.compare(candidatePassword, row.passwordHash);
      },
      async save() {
        const db = getDB();
        const now = new Date().toISOString();
        await db.run(
          `UPDATE users SET name = ?, email = ?, passwordHash = ?, isActive = ?, resetPasswordToken = ?, resetPasswordExpire = ?, updatedAt = ? WHERE _id = ?`,
          [
            this.name,
            this.email,
            this.passwordHash,
            this.isActive ? 1 : 0,
            this.resetPasswordToken || null,
            this.resetPasswordExpire || null,
            now,
            this._id,
          ]
        );
        return this;
      },
      select(fields) {
        return this;
      },
    };
  }
}

const User = new UserModel();
export default User;
