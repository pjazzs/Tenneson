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
router.get("/activity-logs", protect, getActivityLogs);
router.get("/students/export", protect, exportStudents);
router.post("/students", protect, validate(studentSchema), createStudent);
router.get("/students", protect, getStudents);
router.get("/students/verify/:studentId", protect, verifyStudent);
router.get("/students/:studentId", protect, getStudent);
router.put("/students/:studentId", protect, updateStudent);
router.delete("/students/:studentId", protect, deleteStudent);
router.patch("/students/:studentId/restore", protect, restoreStudent);
router.get("/students/archived", protect, getArchivedStudents);

module.exports = router;
