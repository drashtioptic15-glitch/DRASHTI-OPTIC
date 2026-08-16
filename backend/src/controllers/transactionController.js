import Transaction from '../models/Transaction.js';
import { getDateRange } from './salesController.js';

// @desc    Get all transactions with filters and summary
// @route   GET /api/transactions
export const getTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const { search, filter, startDate, endDate, paymentType, status } = req.query;

    let query = {};

    if (filter) {
      const { start, end } = getDateRange(filter, startDate, endDate);
      if (start && end) {
        query.createdAt = { $gte: start, $lte: end };
      }
    }

    if (paymentType && paymentType !== 'all') {
      query.paymentType = paymentType;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    // Summary calculation
    const summaryAgg = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          cashAmount: {
            $sum: {
              $cond: [{ $eq: ['$paymentType', 'Cash'] }, '$amount', 0],
            },
          },
          onlineAmount: {
            $sum: {
              $cond: [{ $ne: ['$paymentType', 'Cash'] }, '$amount', 0],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = summaryAgg[0] || {
      totalAmount: 0,
      cashAmount: 0,
      onlineAmount: 0,
      count: 0,
    };

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('customer', 'customerId name mobile')
      .populate('invoice', 'invoiceNumber grandTotal paymentStatus')
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
