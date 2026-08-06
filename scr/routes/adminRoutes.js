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





router.get(
  "/admins",
  protect,
  authorizePermission("admins.manage"),
  getAdmins
);



module.exports = router;