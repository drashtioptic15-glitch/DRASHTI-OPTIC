import Item from '../models/Item.js';
import Invoice from '../models/Invoice.js';
import { getDB } from '../config/database.js';

// @desc    Get items (paginated, filters, search)
// @route   GET /api/items
export const getItems = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const skip = (page - 1) * limit;

    const { search, category, stockStatus, status } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    // Stock Status filters
    if (stockStatus === 'out') {
      query.stock = { $lte: 0 };
    } else if (stockStatus === 'low') {
      query.$expr = {
        $and: [
          { $gt: ['$stock', 0] },
          { $lte: ['$stock', '$minimumStock'] },
        ],
      };
    } else if (stockStatus === 'in') {
      query.$expr = {
        $gt: ['$stock', '$minimumStock'],
      };
    }

    const total = await Item.countDocuments(query);
    const items = await Item.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: items,
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

// @desc    Get items by category (fast billing dropdown)
// @route   GET /api/items/category/:categoryId
export const getItemsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    
    let filter = { status: 'active' };
    if (categoryId && categoryId !== 'all') {
      filter.category = categoryId;
    }

    const items = await Item.find(filter)
      .populate('category', 'name')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single item by ID
// @route   GET /api/items/:id
export const getItemById = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id).populate('category', 'name');
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new item
// @route   POST /api/items
export const createItem = async (req, res, next) => {
  try {
    const {
      name,
      category,
      sku,
      brand,
      description,
      purchasePrice,
      sellingPrice,
      stock,
      minimumStock,
      status,
    } = req.body;

    if (!name || purchasePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide item name, purchase price, and selling price',
      });
    }

    let finalCategory = category;
    if (!finalCategory) {
      const Category = (await import('../models/Category.js')).default;
      let firstCat = await Category.findOne({});
      if (!firstCat) {
        firstCat = await Category.create({ name: 'General Eyewear', description: 'Default category' });
      }
      finalCategory = firstCat._id;
    }

    // Auto-generate SKU if not provided
    let finalSku = sku ? sku.trim() : '';
    if (!finalSku) {
      const count = await Item.countDocuments();
      finalSku = `SKU-${String(count + 1).padStart(5, '0')}`;
    }

    const item = await Item.create({
      name: name.trim(),
      category: finalCategory,
      sku: finalSku,
      brand: brand ? brand.trim() : '',
      description: description ? description.trim() : '',
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      stock: stock !== undefined ? Number(stock) : 0,
      minimumStock: minimumStock !== undefined ? Number(minimumStock) : 5,
      status: status || 'active',
    });

    const populated = await Item.findById(item._id).populate('category', 'name');

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
export const updateItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    const updated = await Item.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('category', 'name');

    res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
export const deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    const db = getDB();
    const invoiceMatch = await db.get(
      `SELECT COUNT(*) as count FROM invoices WHERE items LIKE ?`,
      [`%${item._id}%`]
    );
    const usedInInvoice = invoiceMatch ? invoiceMatch.count : 0;

    if (usedInInvoice > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete item '${item.name}': It is referenced in ${usedInInvoice} past invoice(s). You can change its status to 'Inactive' instead.`,
      });
    }

    await Item.findByIdAndDelete(item._id);

    res.status(200).json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Quick adjust stock
// @route   POST /api/items/:id/stock
export const adjustStock = async (req, res, next) => {
  try {
    const { action, amount } = req.body; // action: 'add' | 'subtract' | 'set'
    const qty = Number(amount);

    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid non-negative quantity',
      });
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    if (action === 'add') {
      item.stock += qty;
    } else if (action === 'subtract') {
      if (item.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce stock below 0. Current stock is ${item.stock}`,
        });
      }
      item.stock -= qty;
    } else if (action === 'set') {
      item.stock = qty;
    }

    await item.save();

    res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};
