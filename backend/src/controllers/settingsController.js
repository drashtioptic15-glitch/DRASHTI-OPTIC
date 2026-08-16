import StoreSettings from '../models/StoreSettings.js';

// @desc    Get store settings
// @route   GET /api/settings
export const getSettings = async (req, res, next) => {
  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create({});
    }

    // Mask access token for frontend display
    const safeData = settings.toObject();
    if (safeData.whatsappAccessToken) {
      safeData.hasWhatsAppToken = true;
      safeData.whatsappAccessTokenMasked = `${safeData.whatsappAccessToken.substring(0, 6)}...${safeData.whatsappAccessToken.slice(-4)}`;
      // Do not send full token to browser on GET
      safeData.whatsappAccessToken = '';
    } else {
      safeData.hasWhatsAppToken = false;
    }

    res.status(200).json({
      success: true,
      data: safeData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update store settings
// @route   PUT /api/settings
export const updateSettings = async (req, res, next) => {
  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create({});
    }

    const updates = { ...req.body };
    // If whatsappAccessToken is empty string or unmodified masked value, preserve old token
    if (!updates.whatsappAccessToken || updates.whatsappAccessToken.includes('...')) {
      delete updates.whatsappAccessToken;
    }

    const updated = await StoreSettings.findByIdAndUpdate(
      settings._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
