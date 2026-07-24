const express = require("express");
const { createStudent, getStudents } = require("../controllers/studentController");
const router = express.Router();



router.post("/createStudent", createStudent);
router.get("/getStudent", getStudents);

module.exports = router;