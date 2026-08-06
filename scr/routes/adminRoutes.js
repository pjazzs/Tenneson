const express = require("express");

const router = express.Router();


const {
  getAdmins,
} = require("../controllers/adminController");


const {
  protect
} = require("../middleware/authMiddleware");


const {
  authorizePermission
} = require("../middleware/permissionMiddleware");


const {updatePermissions} = require("../controllers/adminController")


router.get(
  "/admins",
  protect,
  authorizePermission("admins.manage"),
  getAdmins
);

router.patch(
  "/admins/:id/permissions",
  protect,
  authorizePermission("admins.update"),
  updatePermissions
);


module.exports = router;