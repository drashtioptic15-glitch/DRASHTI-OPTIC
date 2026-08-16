import { getDB } from '../config/database.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import Item from '../models/Item.js';
import { getDateRange } from './salesController.js';

// @desc    Get dashboard metrics & chart data
// @route   GET /api/reports/dashboard
export const getDashboardStats = async (req, res, next) => {
  try {
    const db = getDB();
    const { chartFilter = 'this_month', startDate, endDate } = req.query;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    // 1. Customer Counts
    const custCountRow = await db.get(`SELECT COUNT(*) as total FROM customers`);
    const totalCustomers = custCountRow ? custCountRow.total : 0;

    const newCustRow = await db.get(
      `SELECT COUNT(*) as total FROM customers WHERE createdAt >= ? AND createdAt <= ?`,
      [monthStart, monthEnd]
    );
    const newCustomersThisMonth = newCustRow ? newCustRow.total : 0;

    // 2. Sales Aggregates
    const todaySalesRow = await db.get(
      `SELECT SUM(grandTotal) as total, SUM(cashAmount + onlineAmount) as paid, SUM(dueAmount) as due, COUNT(*) as count 
       FROM invoices WHERE invoiceDate >= ? AND invoiceDate <= ?`,
      [todayStart, todayEnd]
    );

    const monthSalesRow = await db.get(
      `SELECT SUM(grandTotal) as total, SUM(cashAmount + onlineAmount) as paid, SUM(dueAmount) as due, COUNT(*) as count 
       FROM invoices WHERE invoiceDate >= ? AND invoiceDate <= ?`,
      [monthStart, monthEnd]
    );

    const lifetimeSalesRow = await db.get(
      `SELECT SUM(grandTotal) as total, SUM(cashAmount + onlineAmount) as paid, SUM(dueAmount) as due, 
              SUM(cashAmount) as cash, SUM(onlineAmount) as online, COUNT(*) as count 
       FROM invoices`
    );

    // 3. Inventory Stats
    const totalItemsRow = await db.get(`SELECT COUNT(*) as total FROM items`);
    const totalItems = totalItemsRow ? totalItemsRow.total : 0;

    const outOfStockRow = await db.get(`SELECT COUNT(*) as total FROM items WHERE stock <= 0`);
    const outOfStock = outOfStockRow ? outOfStockRow.total : 0;

    const lowStockRow = await db.get(
      `SELECT COUNT(*) as total FROM items WHERE stock > 0 AND stock <= minimumStock`
    );
    const lowStock = lowStockRow ? lowStockRow.total : 0;

    // 4. Today's Transactions
    const todayTxnsRow = await db.get(
      `SELECT SUM(amount) as totalAmount, COUNT(*) as count FROM transactions WHERE createdAt >= ? AND createdAt <= ?`,
      [todayStart, todayEnd]
    );

    // 5. Recent Sales
    const recentSales = await Invoice.find().sort({ createdAt: -1 }).limit(6);
    // Populate customer info
    for (const sale of recentSales) {
      if (sale.customer) {
        sale.customer = await Customer.findById(sale.customer);
      }
    }

    // 6. Low stock items list
    const lowStockItems = await Item.find({ lowStock: true }).populate('category');

    // 7. Dynamic Chart Data
    const { start: chartStart, end: chartEnd } = getDateRange(chartFilter, startDate, endDate);

    const invoicesForChart = await db.all(
      `SELECT invoiceDate, grandTotal, cashAmount, onlineAmount, dueAmount 
       FROM invoices WHERE invoiceDate >= ? AND invoiceDate <= ? ORDER BY invoiceDate ASC`,
      [new Date(chartStart).toISOString(), new Date(chartEnd).toISOString()]
    );

    let chartData = [];
    if (chartFilter === 'today' || chartFilter === 'yesterday') {
      const hoursMap = {};
      for (let h = 8; h <= 20; h += 2) {
        const label = `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
        hoursMap[label] = { name: label, sales: 0, paid: 0, due: 0, count: 0 };
      }

      invoicesForChart.forEach((inv) => {
        const invDate = new Date(inv.invoiceDate);
        let hour = invDate.getHours();
        if (hour < 8) hour = 8;
        if (hour > 20) hour = 20;
        const bucketHour = Math.floor(hour / 2) * 2;
        const label = `${bucketHour > 12 ? bucketHour - 12 : bucketHour} ${bucketHour >= 12 ? 'PM' : 'AM'}`;
        if (hoursMap[label]) {
          hoursMap[label].sales += Number(inv.grandTotal || 0);
          hoursMap[label].paid += Number(inv.cashAmount || 0) + Number(inv.onlineAmount || 0);
          hoursMap[label].due += Number(inv.dueAmount || 0);
          hoursMap[label].count += 1;
        }
      });
      chartData = Object.values(hoursMap);
    } else {
      const daysMap = {};
      const curr = new Date(chartStart);
      while (curr <= chartEnd) {
        const key = curr.toISOString().split('T')[0];
        const label = curr.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        daysMap[key] = { name: label, dateKey: key, sales: 0, paid: 0, due: 0, count: 0 };
        curr.setDate(curr.getDate() + 1);
      }

      invoicesForChart.forEach((inv) => {
        const invDate = new Date(inv.invoiceDate);
        const key = invDate.toISOString().split('T')[0];
        if (daysMap[key]) {
          daysMap[key].sales += Number(inv.grandTotal || 0);
          daysMap[key].paid += Number(inv.cashAmount || 0) + Number(inv.onlineAmount || 0);
          daysMap[key].due += Number(inv.dueAmount || 0);
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
          today: Number(todaySalesRow?.total || 0),
          todayCount: Number(todaySalesRow?.count || 0),
          thisMonth: Number(monthSalesRow?.total || 0),
          thisMonthCount: Number(monthSalesRow?.count || 0),
          lifetime: Number(lifetimeSalesRow?.total || 0),
          lifetimeCount: Number(lifetimeSalesRow?.count || 0),
        },
        payments: {
          totalPaid: Number(lifetimeSalesRow?.paid || 0),
          totalDue: Number(lifetimeSalesRow?.due || 0),
          cash: Number(lifetimeSalesRow?.cash || 0),
          online: Number(lifetimeSalesRow?.online || 0),
        },
        inventory: {
          totalItems,
          lowStock,
          outOfStock,
        },
        todayTransactions: {
          amount: Number(todayTxnsRow?.totalAmount || 0),
          count: Number(todayTxnsRow?.count || 0),
        },
        recentSales,
        lowStockItems: lowStockItems.slice(0, 6),
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

    const filterObj = {};
    if (start && end) {
      filterObj.startDate = start;
      filterObj.endDate = end;
    }

    const invoices = await Invoice.find(filterObj);

    for (const inv of invoices) {
      if (inv.customer) {
        inv.customer = await Customer.findById(inv.customer);
      }
    }

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
    const db = getDB();
    const rows = await db.all(`SELECT items FROM invoices`);

    const productMap = {};
    for (const row of rows) {
      let items = [];
      try {
        items = JSON.parse(row.items || '[]');
      } catch {
        items = [];
      }
      for (const item of items) {
        const itemId = item.item || item._id || item.name;
        if (!productMap[itemId]) {
          productMap[itemId] = {
            _id: itemId,
            name: item.name,
            categoryName: item.categoryName || '',
            brand: item.brand || '',
            totalQuantitySold: 0,
            totalRevenue: 0,
          };
        }
        productMap[itemId].totalQuantitySold += Number(item.quantity || 0);
        productMap[itemId].totalRevenue += Number(item.total || 0);
      }
    }

    const bestSellers = Object.values(productMap)
      .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
      .slice(0, 15);

    const lowAndOutOfStock = await Item.find({ lowStock: true }).populate('category');

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
    const db = getDB();
    const rows = await db.all(`SELECT * FROM customers ORDER BY totalPurchases DESC LIMIT 20`);

    res.status(200).json({
      success: true,
      data: rows.map((r) => Customer._wrap(r)),
    });
  } catch (error) {
    next(error);
  }
};
