import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import Item from '../models/Item.js';
import Transaction from '../models/Transaction.js';
import { getDateRange } from './salesController.js';

// @desc    Get dashboard metrics & chart data
// @route   GET /api/reports/dashboard
export const getDashboardStats = async (req, res, next) => {
  try {
    const { chartFilter = 'this_month', startDate, endDate } = req.query;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Customer Counts
    const totalCustomers = await Customer.countDocuments();
    const newCustomersThisMonth = await Customer.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    // 2. Sales Aggregates
    const todaySalesAgg = await Invoice.aggregate([
      { $match: { invoiceDate: { $gte: todayStart, $lte: todayEnd } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$grandTotal' },
          paid: { $sum: { $add: ['$cashAmount', '$onlineAmount'] } },
          due: { $sum: '$dueAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthSalesAgg = await Invoice.aggregate([
      { $match: { invoiceDate: { $gte: monthStart, $lte: monthEnd } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$grandTotal' },
          paid: { $sum: { $add: ['$cashAmount', '$onlineAmount'] } },
          due: { $sum: '$dueAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const lifetimeSalesAgg = await Invoice.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$grandTotal' },
          paid: { $sum: { $add: ['$cashAmount', '$onlineAmount'] } },
          due: { $sum: '$dueAmount' },
          cash: { $sum: '$cashAmount' },
          online: { $sum: '$onlineAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // 3. Inventory Stats
    const totalItems = await Item.countDocuments();
    const outOfStock = await Item.countDocuments({ stock: { $lte: 0 } });
    const lowStock = await Item.countDocuments({
      $expr: {
        $and: [
          { $gt: ['$stock', 0] },
          { $lte: ['$stock', '$minimumStock'] },
        ],
      },
    });

    // 4. Today's Transactions
    const todayTxnsAgg = await Transaction.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // 5. Recent Sales
    const recentSales = await Invoice.find()
      .populate('customer', 'name mobile')
      .sort({ createdAt: -1 })
      .limit(6);

    // 6. Low stock items list
    const lowStockItems = await Item.find({
      $expr: { $lte: ['$stock', '$minimumStock'] },
    })
      .populate('category', 'name')
      .sort({ stock: 1 })
      .limit(6);

    // 7. Dynamic Chart Data
    const { start: chartStart, end: chartEnd } = getDateRange(chartFilter, startDate, endDate);
    
    let chartData = [];
    const invoicesForChart = await Invoice.find({
      invoiceDate: { $gte: chartStart, $lte: chartEnd },
    }).sort({ invoiceDate: 1 });

    if (chartFilter === 'today' || chartFilter === 'yesterday') {
      // Group by 2-hour slots: 8am to 8pm
      const hoursMap = {};
      for (let h = 8; h <= 20; h += 2) {
        const label = `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
        hoursMap[label] = { name: label, sales: 0, paid: 0, due: 0, count: 0 };
      }

      invoicesForChart.forEach((inv) => {
        const invDate = new Date(inv.invoiceDate || inv.createdAt);
        let hour = invDate.getHours();
        if (hour < 8) hour = 8;
        if (hour > 20) hour = 20;
        const bucketHour = Math.floor(hour / 2) * 2;
        const label = `${bucketHour > 12 ? bucketHour - 12 : bucketHour} ${bucketHour >= 12 ? 'PM' : 'AM'}`;
        if (hoursMap[label]) {
          hoursMap[label].sales += inv.grandTotal;
          hoursMap[label].paid += (inv.cashAmount || 0) + (inv.onlineAmount || 0);
          hoursMap[label].due += inv.dueAmount || 0;
          hoursMap[label].count += 1;
        }
      });
      chartData = Object.values(hoursMap);
    } else {
      // Daily grouping
      const daysMap = {};
      
      // Seed all dates in the range
      const curr = new Date(chartStart);
      while (curr <= chartEnd) {
        const key = curr.toISOString().split('T')[0];
        const label = curr.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        daysMap[key] = { name: label, dateKey: key, sales: 0, paid: 0, due: 0, count: 0 };
        curr.setDate(curr.getDate() + 1);
      }

      invoicesForChart.forEach((inv) => {
        const invDate = new Date(inv.invoiceDate || inv.createdAt);
        const key = invDate.toISOString().split('T')[0];
        if (daysMap[key]) {
          daysMap[key].sales += inv.grandTotal;
          daysMap[key].paid += (inv.cashAmount || 0) + (inv.onlineAmount || 0);
          daysMap[key].due += inv.dueAmount || 0;
          daysMap[key].count += 1;
        }
      });

      chartData = Object.values(daysMap);
    }

    res.status(200).json({
      success: true,
      data: {
        customers: {
          total: totalCustomers,
          newThisMonth: newCustomersThisMonth,
        },
        sales: {
          today: todaySalesAgg[0]?.total || 0,
          todayCount: todaySalesAgg[0]?.count || 0,
          thisMonth: monthSalesAgg[0]?.total || 0,
          thisMonthCount: monthSalesAgg[0]?.count || 0,
          lifetime: lifetimeSalesAgg[0]?.total || 0,
          lifetimeCount: lifetimeSalesAgg[0]?.count || 0,
        },
        payments: {
          totalPaid: lifetimeSalesAgg[0]?.paid || 0,
          totalDue: lifetimeSalesAgg[0]?.due || 0,
          cash: lifetimeSalesAgg[0]?.cash || 0,
          online: lifetimeSalesAgg[0]?.online || 0,
        },
        inventory: {
          totalItems,
          lowStock,
          outOfStock,
        },
        todayTransactions: {
          amount: todayTxnsAgg[0]?.totalAmount || 0,
          count: todayTxnsAgg[0]?.count || 0,
        },
        recentSales,
        lowStockItems,
        chart: {
          filter: chartFilter,
          data: chartData,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comprehensive sales report
// @route   GET /api/reports/sales
export const getSalesReport = async (req, res, next) => {
  try {
    const { filter = 'this_month', startDate, endDate } = req.query;
    const { start, end } = getDateRange(filter, startDate, endDate);

    let match = {};
    if (start && end) {
      match.invoiceDate = { $gte: start, $lte: end };
    }

    const invoices = await Invoice.find(match)
      .populate('customer', 'customerId name mobile')
      .sort({ invoiceDate: -1 });

    const totals = invoices.reduce(
      (acc, inv) => {
        acc.subtotal += inv.subtotal || 0;
        acc.discount += inv.totalDiscount || 0;
        acc.tax += inv.tax || 0;
        acc.grandTotal += inv.grandTotal || 0;
        acc.paid += (inv.cashAmount || 0) + (inv.onlineAmount || 0);
        acc.due += inv.dueAmount || 0;
        acc.cash += inv.cashAmount || 0;
        acc.online += inv.onlineAmount || 0;
        return acc;
      },
      { subtotal: 0, discount: 0, tax: 0, grandTotal: 0, paid: 0, due: 0, cash: 0, online: 0 }
    );

    res.status(200).json({
      success: true,
      data: {
        filter,
        count: invoices.length,
        totals,
        invoices,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get products analytics report (best-sellers & stock health)
// @route   GET /api/reports/products
export const getProductReport = async (req, res, next) => {
  try {
    // Best selling products aggregated from Invoices
    const bestSellers = await Invoice.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.item',
          name: { $first: '$items.name' },
          categoryName: { $first: '$items.categoryName' },
          brand: { $first: '$items.brand' },
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 15 },
    ]);

    // Low & Out of stock products
    const lowAndOutOfStock = await Item.find({
      $expr: { $lte: ['$stock', '$minimumStock'] },
    })
      .populate('category', 'name')
      .sort({ stock: 1 });

    res.status(200).json({
      success: true,
      data: {
        bestSellers,
        stockAlerts: lowAndOutOfStock,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get top customers report
// @route   GET /api/reports/customers
export const getCustomerReport = async (req, res, next) => {
  try {
    const topCustomers = await Customer.find()
      .sort({ totalPurchases: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: topCustomers,
    });
  } catch (error) {
    next(error);
  }
};
