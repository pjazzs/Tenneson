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
} = require("../controllers/studentcontroller");
const { protect } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validateRequest");
const { studentSchema } = require("../validators/studentValidator");
const upload = require("../middleware/uploadMiddlewear");

const router = express.Router();

router.post(
  "/students/import",
  protect,
  upload.single("file"),
  bulkImportStudents,
);
router.get("/students/dashboard", protect, dashboard);

/**
 * @swagger
 * /api/v1/activity-logs:
 *   get:
 *     summary: Get admin activity logs
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       action:
 *                         type: string
 *                         example: Created student
 *                       admin:
 *                         type: object
 *                         properties:
 *                           fullName:
 *                             type: string
 *                             example: John Admin
 *                           email:
 *                             type: string
 *                             example: admin@gmail.com
 *                       createdAt:
 *                         type: string
 *                         example: 2026-08-02T12:00:00.000Z
 *       401:
 *         description: Unauthorized
 */
router.get("/students/activity-logs", protect, getActivityLogs);
router.get("/students/qrcode/verify/:studentId", verifyStudentQrcode);
router.get("/students/export", protect, exportStudents);
router.post("/students", protect, validate(studentSchema), createStudent);
router.get("/students/:studentId/slip", protect, downloadStudentSlip);
router.get(
  "/students/:studentId/qrcode",
  protect,
  generateStudentQRCode,
);

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
 *                 count:
 *                   type: integer
 *                   example: 20
 *                 students:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       studentId:
 *                         type: string
 *                         example: TCC00023
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
router.get("/students", protect, getStudents);
router.get("/students/verify/:studentId", protect, verifyStudent);
router.get("/students/archived", protect, getArchivedStudents);
router.patch("/students/:studentId/restore", protect, restoreStudent);

/**
 * @swagger
 * /api/v1/students/{studentId}:
 *   get:
 *     summary: Get a single student
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
 *         description: Student found successfully
 *       404:
 *         description: Student not found
 *       401:
 *         description: Unauthorized
 */
router.get("/students/:studentId", protect, getStudent);

/**
 * @swagger
 * /api/v1/students/{studentId}:
 *   put:
 *     summary: Update student details
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
 * 
 * 
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
router.put("/students/:studentId", protect, updateStudent);

/**
 * @swagger
 * /api/v1/students/{studentId}:
 *   delete:
 *     summary: Delete a student
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
 *         description: Student deleted successfully
 *       404:
 *         description: Student not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/students/:studentId", protect, deleteStudent);



module.exports = router;
