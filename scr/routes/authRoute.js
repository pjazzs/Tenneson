const express = require("express");
const { registerAdmin, loginAdmin } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { authLimiter } = require("../middleware/rateLimiter");
const {
  authorizePermission,
} = require("../middleware/permissionMiddleware");

const router = express.Router();
router.post(
  "/auth/register",
  protect,
  authorizePermission("admins.create"),
  registerAdmin,
);


tags: [
  {
    name: "Authentication",
    description: "Admin authentication endpoints",
  },
  {
    name: "Students",
    description: "Student management endpoints",
  },
],
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

/**
 * @swagger
 * /api/v1/students/{studentId}/slip:
 *   get:
 *     summary: Download student registration slip PDF
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         example: TCC00023
 *     responses:
 *       200:
 *         description: PDF registration slip
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Student not found
 */

/**
 * @swagger
 * /api/v1/students/verify/{studentId}:
 *   get:
 *     summary: Verify student ID
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         example: TCC00023
 *     responses:
 *       200:
 *         description: Student verified
 *       404:
 *         description: Invalid student ID
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login admin
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

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new admin
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Admin
 *               email:
 *                 type: string
 *                 example: admin@gmail.com
 *               password:
 *                 type: string
 *                 example: password123
 *               role:
 *                 type: string
 *                 example: admin
 *     responses:
 *       201:
 *         description: Admin created successfully
 *       401:
 *         description: Unauthorized
 */


router.post(
  "/auth/login",
  ...(process.env.NODE_ENV === "test" ? [] : [authLimiter]),
  loginAdmin
);


module.exports = router;
