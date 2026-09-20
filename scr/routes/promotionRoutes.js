const express = require("express");

const {
  getPromotions,
  applyPromotion,
} = require("../controllers/promotionController");

const { protect } = require("../middleware/authMiddleware");
const { authorizePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

router.get(
  "/promotions",
  protect,
  authorizePermission("promotion.view"),
  getPromotions,
);

router.patch(
  "/promotions/:resultId/apply",
  protect,
  authorizePermission("promotion.apply"),
  applyPromotion,
);

module.exports = router;
