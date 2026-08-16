import Prescription from '../models/Prescription.js';
import Customer from '../models/Customer.js';

// @desc    Get all prescriptions across all customers with search & pagination
// @route   GET /api/prescriptions
export const getAllPrescriptions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const skip = (page - 1) * limit;
    const { search, customerId } = req.query;

    let query = {};

    if (customerId) {
      query.customer = customerId;
    }

    if (search) {
      // Find matching customers first
      const matchingCustomers = await Customer.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } },
          { customerId: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const customerIds = matchingCustomers.map((c) => c._id);

      query.$or = [
        { customer: { $in: customerIds } },
        { doctor: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Prescription.countDocuments(query);
    const prescriptions = await Prescription.find(query)
      .populate('customer', 'customerId name mobile email city')
      .sort({ prescriptionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: prescriptions.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
      data: prescriptions,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single prescription by ID
// @route   GET /api/prescriptions/:id
export const getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id).populate(
      'customer',
      'customerId name mobile email address city state pincode totalPurchases totalPaid totalDue'
    );

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription record not found',
      });
    }

    res.status(200).json({
      success: true,
      data: prescription,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new optical prescription
// @route   POST /api/prescriptions
export const createPrescription = async (req, res, next) => {
  try {
    const { customerId, customer, customerData, rightEye, leftEye, doctor, notes, prescriptionDate } = req.body;

    let targetCustomerId = customerId || customer;

    // If customerId not provided, search or create customer
    if (!targetCustomerId && customerData) {
      if (!customerData.name || !customerData.mobile) {
        return res.status(400).json({
          success: false,
          message: 'Customer name and mobile number are required to record prescription',
        });
      }

      let existing = await Customer.findOne({ mobile: customerData.mobile.trim() });
      if (existing) {
        targetCustomerId = existing._id;
      } else {
        const custId = await Customer.generateCustomerId();
        const newCust = await Customer.create({
          customerId: custId,
          name: customerData.name.trim(),
          mobile: customerData.mobile.trim(),
          alternateMobile: customerData.alternateMobile?.trim() || '',
          email: customerData.email?.trim() || '',
          address: customerData.address?.trim() || '',
          city: customerData.city?.trim() || '',
        });
        targetCustomerId = newCust._id;
      }
    }

    if (!targetCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'A valid customer must be selected or provided',
      });
    }

    const newPrescription = await Prescription.create({
      customer: targetCustomerId,
      rightEye: rightEye || {},
      leftEye: leftEye || {},
      doctor: doctor?.trim() || '',
      notes: notes?.trim() || '',
      prescriptionDate: prescriptionDate ? new Date(prescriptionDate) : Date.now(),
    });

    const populated = await Prescription.findById(newPrescription._id).populate(
      'customer',
      'customerId name mobile email city'
    );

    res.status(201).json({
      success: true,
      message: 'Prescription recorded successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update prescription
// @route   PUT /api/prescriptions/:id
export const updatePrescription = async (req, res, next) => {
  try {
    const { rightEye, leftEye, doctor, notes, prescriptionDate } = req.body;

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    if (rightEye) prescription.rightEye = rightEye;
    if (leftEye) prescription.leftEye = leftEye;
    if (doctor !== undefined) prescription.doctor = doctor.trim();
    if (notes !== undefined) prescription.notes = notes.trim();
    if (prescriptionDate) prescription.prescriptionDate = new Date(prescriptionDate);

    await prescription.save();

    const populated = await Prescription.findById(prescription._id).populate(
      'customer',
      'customerId name mobile email city'
    );

    res.status(200).json({
      success: true,
      message: 'Prescription updated successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete prescription
// @route   DELETE /api/prescriptions/:id
export const deletePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    await Prescription.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Prescription record deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
