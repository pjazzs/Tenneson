const express = require("express");
const router = express.Router();

const {
  verifyOfficialResult,
} = require("../controllers/resultVerificationController");

/*
 * Public verification of an official student result document.
 * No student or admin login is required.
 */
router.get("/verify-result/:code", verifyOfficialResult);

module.exports = router;
