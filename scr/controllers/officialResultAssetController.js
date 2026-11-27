const asyncHandler = require("express-async-handler");
const SchoolDocumentSettings = require("../models/SchoolDocumentSettings");
const cloudinary = require("../config/cloudinary");
const createAuditLog = require("../utils/createAuditLog");

const SETTINGS_KEY = "official_result_documents";

const ASSET_TYPES = {
  stamp: "stamp",
  signature: "signature",
};

const getSettings = async () => {
  let settings = await SchoolDocumentSettings.findOne({
    key: SETTINGS_KEY,
  });

  if (!settings) {
    settings = await SchoolDocumentSettings.create({
      key: SETTINGS_KEY,
    });
  }

  return settings;
};

// GET CURRENT OFFICIAL RESULT ASSETS
exports.getOfficialResultAssets = asyncHandler(async (req, res) => {
  const settings = await getSettings();

  return res.status(200).json({
    success: true,
    assets: {
      stamp: {
        url: settings.stamp?.url || "",
        publicId: settings.stamp?.publicId || "",
      },
      signature: {
        url: settings.signature?.url || "",
        publicId: settings.signature?.publicId || "",
      },
      assetVersion: settings.assetVersion || 1,
      updatedAt: settings.updatedAt,
    },
  });
});

// UPLOAD OR REPLACE AN OFFICIAL RESULT ASSET
exports.uploadOfficialResultAsset = asyncHandler(async (req, res) => {
  const { type } = req.params;

  if (!Object.values(ASSET_TYPES).includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid asset type. Use stamp or signature.",
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please select an image to upload.",
    });
  }

  const settings = await getSettings();

  const previousAsset = {
    url: settings[type]?.url || "",
    publicId: settings[type]?.publicId || "",
  };

  settings[type] = {
    url: req.file.path,
    publicId: req.file.filename,
  };

  settings.assetVersion = (settings.assetVersion || 1) + 1;
  settings.updatedBy = req.admin._id;

  try {
    await settings.save();
  } catch (error) {
    if (req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (cleanupError) {
        console.error(
          "New official result asset cleanup error:",
          cleanupError.message,
        );
      }
    }

    throw error;
  }

  if (previousAsset.publicId && previousAsset.publicId !== req.file.filename) {
    try {
      await cloudinary.uploader.destroy(previousAsset.publicId);
    } catch (error) {
      console.error(
        "Previous official result asset deletion error:",
        error.message,
      );
    }
  }

  await createAuditLog({
    user: req.admin._id,
    action: "UPDATE_OFFICIAL_RESULT_ASSET",
    module: "RESULT_DOCUMENT",
    description: `${req.admin.fullName} uploaded or replaced the official result ${type}.`,
    req,
  });

  return res.status(200).json({
    success: true,
    message: `Official result ${type} uploaded successfully.`,
    asset: {
      type,
      url: settings[type].url,
      publicId: settings[type].publicId,
      assetVersion: settings.assetVersion,
    },
  });
});
