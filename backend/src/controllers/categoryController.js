import Category from '../models/Category.js';
import Item from '../models/Item.js';

// @desc    Get all categories
// @route   GET /api/categories
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    
    // Add item count to each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const itemCount = await Item.countDocuments({ category: cat._id });
        const catData = cat.toObject ? cat.toObject() : cat;
        return {
          ...catData,
          itemCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: categoriesWithCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category by ID
// @route   GET /api/categories/:id
export const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const itemCount = await Item.countDocuments({ category: category._id });
    const catData = category.toObject ? category.toObject() : category;

    res.status(200).json({
      success: true,
      data: {
        ...catData,
        itemCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new category
// @route   POST /api/categories
export const createCategory = async (req, res, next) => {
  try {
    const { name, description, status } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    const existing = await Category.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Category '${name}' already exists`,
      });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      status: status || 'active',
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    if (req.body.name && req.body.name.trim().toLowerCase() !== category.name.toLowerCase()) {
      const existing = await Category.findOne({
        name: { $regex: `^${req.body.name.trim()}$`, $options: 'i' },
      });
      if (existing && String(existing._id) !== String(category._id)) {
        return res.status(400).json({
          success: false,
          message: `Category '${req.body.name}' already exists`,
        });
      }
    }

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category (checks for items first)
// @route   DELETE /api/categories/:id
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const itemCount = await Item.countDocuments({ category: category._id });
    if (itemCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category '${category.name}': There are ${itemCount} items linked to it. Please reassign or delete these items first.`,
      });
    }

    await Category.findByIdAndDelete(category._id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
