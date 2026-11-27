const mongoose = require("mongoose");

const schoolDocumentSettingsSchema = new mongoose.Schema(
  {
    // Only one settings record should exist for the school.
    key: {
      type: String,
      default: "official_result_documents",
      unique: true,
      required: true,
    },

    stamp: {
      url: {
        type: String,
        default: "",
        trim: true,
      },

      publicId: {
        type: String,
        default: "",
        trim: true,
      },
    },

    signature: {
      url: {
        type: String,
        default: "",
        trim: true,
      },

      publicId: {
        type: String,
        default: "",
        trim: true,
      },
    },

    // Increment whenever either asset is replaced.
    assetVersion: {
      type: Number,
      default: 1,
      min: 1,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const SchoolDocumentSettings =
  mongoose.models.SchoolDocumentSettings ||
  mongoose.model("SchoolDocumentSettings", schoolDocumentSettingsSchema);

module.exports = SchoolDocumentSettings;
