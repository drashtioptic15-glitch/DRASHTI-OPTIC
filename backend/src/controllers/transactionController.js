import Transaction from '../models/Transaction.js';
import { getDateRange } from './salesController.js';
import { getDB } from '../config/database.js';

// @desc    Get all transactions with filters and summary
// @route   GET /api/transactions
export const getTransactions = async (req, res, next) => {
  try {
    const db = getDB();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const { search, filter, startDate, endDate, paymentType, status } = req.query;

    const clauses = [];
    const params = [];

    if (filter) {
      const { start, end } = getDateRange(filter, startDate, endDate);
      if (start && end) {
        clauses.push('createdAt >= ? AND createdAt <= ?');
        params.push(new Date(start).toISOString(), new Date(end).toISOString());
      }
    }

    if (paymentType && paymentType !== 'all') {
      clauses.push('paymentType = ?');
      params.push(paymentType);
    }

    if (status && status !== 'all') {
      clauses.push('status = ?');
      params.push(status);
    }

    if (search) {
      clauses.push('(transactionId LIKE ? OR referenceNumber LIKE ? OR notes LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

    // Summary calculation
    const summaryRow = await db.get(
      `SELECT SUM(amount) as totalAmount, 
              SUM(CASE WHEN paymentType = 'Cash' THEN amount ELSE 0 END) as cashAmount,
              SUM(CASE WHEN paymentType != 'Cash' THEN amount ELSE 0 END) as onlineAmount,
              COUNT(*) as count
       FROM transactions ${where}`,
      params
    );

    const summary = {
      totalAmount: Number(summaryRow?.totalAmount || 0),
      cashAmount: Number(summaryRow?.cashAmount || 0),
      onlineAmount: Number(summaryRow?.onlineAmount || 0),
      count: Number(summaryRow?.count || 0),
    };

    const countRow = await db.get(`SELECT COUNT(*) as total FROM transactions ${where}`, params);
    const total = countRow ? countRow.total : 0;

    const transactions = await Transaction.find(req.query)
      .populate('customer invoice')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: transactions,
      summary,
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

// @desc    Get single transaction by ID
// @route   GET /api/transactions/:id
export const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('customer')
      .populate('invoice');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};
