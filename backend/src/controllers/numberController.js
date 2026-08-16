import PhoneNumber from '../models/PhoneNumber.js';

// @desc    Get all phone numbers (paginated + search)
// @route   GET /api/numbers
export const getNumbers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { search, type, status } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { number: { $regex: search, $options: 'i' } },
        { label: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const total = await PhoneNumber.countDocuments(query);
    const numbers = await PhoneNumber.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: numbers,
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

// @desc    Get single phone number by ID
// @route   GET /api/numbers/:id
export const getNumberById = async (req, res, next) => {
  try {
    const record = await PhoneNumber.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not found',
      });
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new phone number record
// @route   POST /api/numbers
export const createNumber = async (req, res, next) => {
  try {
    const { number, label, type, status, notes } = req.body;

    if (!number || !label) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and Label / Name are required',
      });
    }

    const cleanedNumber = number.trim();
    const existing = await PhoneNumber.findOne({ number: cleanedNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Phone number ${cleanedNumber} already exists under label: ${existing.label}`,
      });
    }

    const newRecord = await PhoneNumber.create({
      number: cleanedNumber,
      label: label.trim(),
      type: type || 'Customer',
      status: status || 'active',
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Phone number added successfully',
      data: newRecord,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update phone number
// @route   PUT /api/numbers/:id
export const updateNumber = async (req, res, next) => {
  try {
    const record = await PhoneNumber.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not found',
      });
    }

    if (req.body.number && req.body.number.trim() !== record.number) {
      const existing = await PhoneNumber.findOne({ number: req.body.number.trim() });
      if (existing && String(existing._id) !== String(record._id)) {
        return res.status(400).json({
          success: false,
          message: `Phone number ${req.body.number} is already in use by '${existing.label}'`,
        });
      }
    }

    const updated = await PhoneNumber.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Phone number updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete phone number
// @route   DELETE /api/numbers/:id
export const deleteNumber = async (req, res, next) => {
  try {
    const record = await PhoneNumber.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Phone number deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
