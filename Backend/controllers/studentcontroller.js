const Student = require("../Models/students");
const generateStudentId = require("../utils/generateStudentId");

exports.createStudent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      otherName,
      gender,
      dateOfBirth,
      currentClass,
      session,
      parentName,
      parentPhone,
    } = req.body;

    // Basic validation
    if (
      !firstName ||
      !lastName ||
      !gender ||
      !dateOfBirth ||
      !currentClass ||
      !session
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields.",
      });
    }

    // Generate Student ID
    const studentId = await generateStudentId();

    // Create student
    const student = await Student.create({
      studentId,
      firstName,
      lastName,
      otherName,
      gender,
      dateOfBirth,
      currentClass,
      session,
      parentName,
      parentPhone,
    });

    res.status(201).json({
      success: true,
      message: "Student created successfully.",
      student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const totalStudents = await Student.countDocuments();

    const students = await Student.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalStudents / limit),
      totalStudents,
      students,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};