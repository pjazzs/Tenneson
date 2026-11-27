const express = require("express");

const {
  getOfficialResultAssets,
  uploadOfficialResultAsset,
} = require("../controllers/officialResultAssetController");

const { protect } = require("../middleware/authMiddleware");

const { authorizePermission } = require("../middleware/permissionMiddleware");

const uploadOfficialResultAssetMiddleware = require("../middleware/officialResultAssetUpload");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Get Official Result Assets
|--------------------------------------------------------------------------
*/

router.get(
  "/official-result-assets",
  protect,
  authorizePermission("results.documents.manage"),
  getOfficialResultAssets,
);

/*
|--------------------------------------------------------------------------
| Upload or Replace Stamp / Signature
|--------------------------------------------------------------------------
*/

router.patch(
  "/official-result-assets/:type",
  protect,
  authorizePermission("results.documents.manage"),
  uploadOfficialResultAssetMiddleware.single("asset"),
  uploadOfficialResultAsset,
);

module.exports = router;
