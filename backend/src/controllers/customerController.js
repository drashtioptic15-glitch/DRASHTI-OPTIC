import Customer from '../models/Customer.js';
import Prescription from '../models/Prescription.js';
import Invoice from '../models/Invoice.js';

// @desc    Get all customers (paginated + search)
// @route   GET /api/customers
export const getCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } },
          { customerId: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: customers,
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

// @desc    Fast search customers for autocomplete in billing
// @route   GET /api/customers/search
export const searchCustomers = async (req, res, next) => {
  try {
    const { name, mobile, query, search } = req.query;
    const searchTerm = (query || search || name || mobile || '').trim();

    const customers = await Customer.find({ search: searchTerm })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer by ID with full invoices & prescriptions
// @route   GET /api/customers/:id
export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Fetch invoices for this customer
    const invoices = await Invoice.find({ customer: customer._id })
      .sort({ createdAt: -1 });

    // Fetch prescriptions for this customer
    const prescriptions = await Prescription.find({ customer: customer._id })
      .sort({ createdAt: -1 });

    const custData = customer.toObject ? customer.toObject() : customer;
    res.status(200).json({
      success: true,
      data: {
        ...custData,
        invoices,
        prescriptions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new customer
// @route   POST /api/customers
export const createCustomer = async (req, res, next) => {
  try {
    const { name, mobile, alternateMobile, email, address, city, state, pincode, notes } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and mobile number are required',
      });
    }

    // Check if customer with mobile exists
    const existing = await Customer.findOne({ mobile: mobile.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A customer with mobile number ${mobile} already exists: ${existing.name} (${existing.customerId})`,
      });
    }

    const customer = await Customer.create({
      name: name.trim(),
      mobile: mobile.trim(),
      alternateMobile: alternateMobile ? alternateMobile.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      pincode: pincode ? pincode.trim() : '',
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
export const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // If mobile is being changed, check uniqueness
    if (req.body.mobile && req.body.mobile.trim() !== customer.mobile) {
      const existing = await Customer.findOne({ mobile: req.body.mobile.trim() });
      if (existing && String(existing._id) !== String(customer._id)) {
        return res.status(400).json({
          success: false,
          message: `Another customer is already registered with mobile ${req.body.mobile}`,
        });
      }
    }

    const updated = await Customer.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
export const deleteCustomer = async (req, res, next) => {
  try {
    const customerId = req.params.id;

    // Delete customer prescriptions
    await Prescription.deleteMany({ customer: customerId });
    await Customer.findByIdAndDelete(customerId);

    res.status(200).json({
      success: true,
      message: 'Customer and related records deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ================= Prescription Sub-APIs =================

// @desc    Add prescription to customer
// @route   POST /api/customers/:id/prescriptions
export const addCustomerPrescription = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const { rightEye, leftEye, doctor, notes, prescriptionDate } = req.body;

    const prescription = await Prescription.create({
      customer: customer._id,
      rightEye: rightEye || {},
      leftEye: leftEye || {},
      doctor: doctor || '',
      notes: notes || '',
      prescriptionDate: prescriptionDate || Date.now(),
    });

    res.status(201).json({
      success: true,
      message: 'Prescription recorded successfully',
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get prescriptions of a customer
// @route   GET /api/customers/:id/prescriptions
export const getCustomerPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ customer: req.params.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: prescriptions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update prescription
// @route   PUT /api/customers/:customerId/prescriptions/:prescriptionId
export const updatePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findByIdAndUpdate(
      req.params.prescriptionId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prescription updated successfully',
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete prescription
// @route   DELETE /api/customers/:customerId/prescriptions/:prescriptionId
export const deletePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findByIdAndDelete(req.params.prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prescription deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
