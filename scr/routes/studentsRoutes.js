const express = require("express");

const {
  createStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  restoreStudent,
  getArchivedStudents,
  verifyStudent,
  dashboard,
  bulkImportStudents,
  exportStudents,
  getActivityLogs,
  downloadStudentSlip,
  verifyStudentQrcode,
  generateStudentQRCode,
  uploadStudentPhoto,
  monthlyRegistrationAnalytics,
  classAnalytics,
} = require("../controllers/studentcontroller");

const { protect } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validateRequest");

const {
  studentSchema,
  studentUpdateSchema,
} = require("../validators/studentValidator");

const upload = require("../middleware/uploadMiddlewear");
const uploadPhoto = require("../middleware/photoUpload");

const { authorizePermission } = require("../middleware/permissionMiddleware");

const { verifyLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Student Import
|--------------------------------------------------------------------------
*/

router.post(
  "/students/import",
  protect,
  authorizePermission("students.import"),
  upload.single("file"),
  bulkImportStudents,
);

/*
|--------------------------------------------------------------------------
| Student Dashboard & Analytics
|--------------------------------------------------------------------------
*/

router.get("/students/dashboard", protect, dashboard);

router.get(
  "/students/analytics/monthly",
  protect,
  monthlyRegistrationAnalytics,
);

router.get("/students/analytics/classes", protect, classAnalytics);

/*
|--------------------------------------------------------------------------
| Activity Logs
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /api/v1/students/activity-logs:
 *   get:
 *     summary: Get admin activity logs
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/students/activity-logs",
  protect,
  authorizePermission("students.view"),
  getActivityLogs,
);

/*
|--------------------------------------------------------------------------
| Public Student Verification
|--------------------------------------------------------------------------
|
| These endpoints intentionally use the official studentId.
|
| Example:
| 2025/TCC00073
|
*/

router.get("/students/qrcode/verify/:identifier", verifyStudentQrcode);

router.get("/students/verify/:studentId", verifyLimiter, verifyStudent);

/*
|--------------------------------------------------------------------------
| Student Export
|--------------------------------------------------------------------------
*/

router.get(
  "/students/export",
  protect,
  authorizePermission("students.export"),
  exportStudents,
);

/*
|--------------------------------------------------------------------------
| Create Student
|--------------------------------------------------------------------------
*/

router.post(
  "/students",
  protect,
  authorizePermission("students.create"),
  validate(studentSchema),
  createStudent,
);

/*
|--------------------------------------------------------------------------
| Archived Students
|--------------------------------------------------------------------------
*/

router.get(
  "/students/archived",
  protect,
  authorizePermission("students.view"),
  getArchivedStudents,
);

/*
|--------------------------------------------------------------------------
| Get All Students
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /api/v1/students:
 *   get:
 *     summary: Get all students
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of students returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 students:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 68c123456789abcdef123456
 *                       studentId:
 *                         type: string
 *                         example: 2025/TCC00023
 *                       firstName:
 *                         type: string
 *                         example: John
 *                       lastName:
 *                         type: string
 *                         example: Doe
 *                       currentClass:
 *                         type: string
 *                         example: JSS1
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/students",
  protect,
  authorizePermission("students.view"),
  getStudents,
);

/*
|--------------------------------------------------------------------------
| Student Resource Routes
|--------------------------------------------------------------------------
|
| These routes use MongoDB _id.
|
| Example:
| /api/v1/students/68c123456789abcdef123456
|
*/

/*
|--------------------------------------------------------------------------
| Restore Student
|--------------------------------------------------------------------------
*/

router.patch(
  "/students/:id/restore",
  protect,
  authorizePermission("students.restore"),
  restoreStudent,
);

/*
|--------------------------------------------------------------------------
| Upload Student Photo
|--------------------------------------------------------------------------
*/

router.patch(
  "/students/:id/photo",
  protect,
  authorizePermission("students.photo"),
  uploadPhoto.single("photo"),
  uploadStudentPhoto,
);

/*
|--------------------------------------------------------------------------
| Generate Student QR Code
|--------------------------------------------------------------------------
*/

router.get("/students/:id/qrcode", protect, generateStudentQRCode);

/*
|--------------------------------------------------------------------------
| Download Student Slip
|--------------------------------------------------------------------------
*/

router.get(
  "/students/:id/slip",
  protect,
  authorizePermission("students.view"),
  downloadStudentSlip,
);

/*
|--------------------------------------------------------------------------
| Get Single Student
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /api/v1/students/{id}:
 *   get:
 *     summary: Get a single student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB student document ID
 *         example: 68c123456789abcdef123456
 *     responses:
 *       200:
 *         description: Student found successfully
 *       404:
 *         description: Student not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/students/:id",
  protect,
  authorizePermission("students.view"),
  getStudent,
);

/*
|--------------------------------------------------------------------------
| Update Student
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /api/v1/students/{id}:
 *   put:
 *     summary: Update student details
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB student document ID
 *         example: 68c123456789abcdef123456
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Michael
 *               currentClass:
 *                 type: string
 *                 example: JSS2
 *               parentPhone:
 *                 type: string
 *                 example: 08012345678
 *     responses:
 *       200:
 *         description: Student updated successfully
 *       404:
 *         description: Student not found
 */
router.put(
  "/students/:id",
  protect,
  authorizePermission("students.update"),
  validate(studentUpdateSchema),
  updateStudent,
);

/*
|--------------------------------------------------------------------------
| Delete / Archive Student
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /api/v1/students/{id}:
 *   delete:
 *     summary: Delete a student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB student document ID
 *         example: 68c123456789abcdef123456
 *     responses:
 *       200:
 *         description: Student deleted successfully
 *       404:
 *         description: Student not found
 *       401:
 *         description: Unauthorized
 */
router.delete(
  "/students/:id",
  protect,
  authorizePermission("students.delete"),
  deleteStudent,
);

module.exports = router;
