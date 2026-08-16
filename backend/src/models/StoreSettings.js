import { getDB } from '../config/database.js';

class StoreSettingsModel {
  async findOne() {
    const db = getDB();
    let row = await db.get(`SELECT * FROM store_settings LIMIT 1`);
    if (!row) {
      row = await this._initDefault(db);
    }
    return this._wrap(row);
  }

  async findOneAndUpdate(filter = {}, updates = {}, options = {}) {
    return await this.findByIdAndUpdate('default_store_settings', updates, options);
  }

  async findByIdAndUpdate(id, updates = {}, options = {}) {
    const db = getDB();
    let existing = await db.get(`SELECT * FROM store_settings LIMIT 1`);
    if (!existing) {
      existing = await this._initDefault(db);
    }

    const payload = updates.$set || updates;
    const now = new Date().toISOString();
    const setClauses = ['updatedAt = ?'];
    const params = [now];

    const fields = [
      'storeName',
      'tagline',
      'logoUrl',
      'address',
      'city',
      'state',
      'pincode',
      'phone',
      'email',
      'website',
      'gstNumber',
      'invoicePrefix',
      'invoiceFooter',
      'whatsappPhoneNumberId',
      'whatsappBusinessAccountId',
      'whatsappAccessToken',
      'currencySymbol',
      'taxRate',
    ];

    for (const field of fields) {
      if (payload[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(payload[field]);
      }
    }

    params.push(existing._id);
    await db.run(`UPDATE store_settings SET ${setClauses.join(', ')} WHERE _id = ?`, params);
    return await this.findOne();
  }

  async _initDefault(db) {
    const now = new Date().toISOString();
    const defaultSettings = {
      _id: 'default_store_settings',
      storeName: 'Drashti Optic',
      tagline: 'EYEGLASSES | CONTACT LENSES | SUNGLASSES',
      logoUrl: '/logo.png',
      address: 'Swaminarayn Chowk',
      city: 'Rajkot',
      state: 'Gujarat',
      pincode: '380001',
      phone: '+91 98765 43210',
      email: 'contact@drashtioptic.com',
      website: 'www.drashtioptic.com',
      gstNumber: '24ABCDE1234F1Z5',
      invoicePrefix: 'INV',
      invoiceFooter:
        'Thank you for choosing Drashti Optic! Goods once sold will be serviced with care. Please carry this invoice for warranty and complimentary adjustments.',
      whatsappPhoneNumberId: '',
      whatsappBusinessAccountId: '',
      whatsappAccessToken: '',
      currencySymbol: '₹',
      taxRate: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.run(
      `INSERT OR REPLACE INTO store_settings (_id, storeName, tagline, logoUrl, address, city, state, pincode, phone, email, website, gstNumber, invoicePrefix, invoiceFooter, whatsappPhoneNumberId, whatsappBusinessAccountId, whatsappAccessToken, currencySymbol, taxRate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        defaultSettings._id,
        defaultSettings.storeName,
        defaultSettings.tagline,
        defaultSettings.logoUrl,
        defaultSettings.address,
        defaultSettings.city,
        defaultSettings.state,
        defaultSettings.pincode,
        defaultSettings.phone,
        defaultSettings.email,
        defaultSettings.website,
        defaultSettings.gstNumber,
        defaultSettings.invoicePrefix,
        defaultSettings.invoiceFooter,
        defaultSettings.whatsappPhoneNumberId,
        defaultSettings.whatsappBusinessAccountId,
        defaultSettings.whatsappAccessToken,
        defaultSettings.currencySymbol,
        defaultSettings.taxRate,
        defaultSettings.createdAt,
        defaultSettings.updatedAt,
      ]
    );

    return defaultSettings;
  }

  _wrap(row) {
    if (!row) return null;
    return {
      ...row,
      id: row._id,
      taxRate: Number(row.taxRate || 0),
      toObject() {
        return { ...this };
      },
    };
  }
}

const StoreSettings = new StoreSettingsModel();
export default StoreSettings;
