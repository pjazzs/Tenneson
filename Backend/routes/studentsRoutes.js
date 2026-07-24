const express = require("express");
const { createStudent, getStudents } = require("../controllers/studentController");
const router = express.Router();



router.post("/students", createStudent);
router.get("/students", getStudents);

module.exports = router;