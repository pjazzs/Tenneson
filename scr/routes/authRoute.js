const express = require("express");
const { registerAdmin, loginAdmin } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();
router.post(
  "/auth/register",
  protect,
  authorize("super_admin"),
  registerAdmin,
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login an admin
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@gmail.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/auth/login",
  ...(process.env.NODE_ENV === "test" ? [] : [authLimiter]),
  loginAdmin
);

module.exports = router;
