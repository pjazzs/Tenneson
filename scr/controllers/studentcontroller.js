const XLSX = require("xlsx");
const fs = require("fs");
const asyncHandler = require("express-async-handler");
const Student = require("../models/student");
const generateStudentId = require("../utils/generateStudentId");
const logActivity = require("../utils/logActivity");
const ActivityLog = require("../models/activityLog");
const generateStudentSlip = require("../utils/generateStudentSlip");

exports.createStudent = asyncHandler(async (req, res) => {
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

  const existingStudent = await Student.findOne({
    firstName: {
      $regex: new RegExp(`^${firstName.trim()}$`, "i"),
    },
    lastName: {
      $regex: new RegExp(`^${lastName.trim()}$`, "i"),
    },
    dateOfBirth: new Date(dateOfBirth),
    isActive: true,
  });

  if (existingStudent) {
    res.status(409);
    throw new Error("A student with these details already exists.");
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
    admissionDate: new Date(),
    parentName,
    parentPhone,
    createdBy: req.admin._id,
    updatedBy: req.admin._id,
  });

  await logActivity({
    adminId: req.admin._id,
    action: "CREATE_STUDENT",
    studentId: student.studentId,
    details: `Created student ${student.firstName} ${student.lastName}`,
  });

  res.status(201).json({
    success: true,
    message: "Student created successfully.",
    student,
  });
});

exports.getStudents = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const skip = (page - 1) * limit;

  const students = await Student.find({ isActive: true })
    .skip(skip)
    .limit(limit);

  const totalStudents = await Student.countDocuments({
    isActive: true,
  });

  res.status(200).json({
    success: true,
    students,
    pagination: {
      currentPage: page,
      limit,
      totalStudents,
      totalPages: Math.ceil(totalStudents / limit),
    },
  });
});

exports.getStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findOne({
    studentId,
    isActive: true,
  })
    .populate("createdBy", "fullName email -_id")
    .populate("updatedBy", "fullName email -_id");

  if (!student) {
    res.status(404);
    throw new Error("Student not found.");
  }

  res.status(200).json({
    success: true,
    student,
  });
});

exports.updateStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  delete req.body.studentId;

  const student = await Student.findOneAndUpdate(
    { studentId },
    {
      ...req.body,
      updatedBy: req.admin._id,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!student) {
    res.status(404);
    throw new Error("Student not found.");
  }

  await logActivity({
    adminId: req.admin._id,
    action: "Updated Student",
    studentId: student.studentId,
    details: `${student.firstName} ${student.lastName}`,
  });

  return res.status(200).json({
    success: true,
    message: "Student updated successfully.",
    student,
  });
});

exports.deleteStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findOneAndUpdate(
    { studentId },
    { isActive: false },
    { returnDocument: "after" },
  );

  if (!student) {
    res.status(404);
    throw new Error("Student not found.");
  }

  await logActivity({
    adminId: req.admin._id,
    action: "DELETE_STUDENT",
    studentId: student.studentId,
    details: `${student.firstName} ${student.lastName}`,
  });

  await student.deleteOne();

  res.status(200).json({
    success: true,
    message: "Student deleted successfully",
  });
});

exports.restoreStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findOneAndUpdate(
    {
      studentId,
      isActive: false,
    },
    {
      isActive: true,
    },
    {
      returnDocument: "after",
    },
  );

  await logActivity({
    adminId: req.admin._id,
    action: "Restored Student",
    studentId: student.studentId,
    details: `${student.firstName} ${student.lastName}`,
  });
  if (!student) {
    res.status(404);
    throw new Error("Student not found or already active.");
  }
});

exports.getArchivedStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({
    isActive: false,
  }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    totalStudents: students.length,
    students,
  });
});

exports.verifyStudent = async (req, res) => {
  console.log("VERIFY ID:", req.params.studentId);

  const student = await Student.findOne({
    studentId: req.params.studentId,
  });

  console.log("FOUND STUDENT:", student);

  if (!student || student.isActive === false) {
    return res.status(404).json({
      success: false,
      verified: false,
      exists: false,
      message: "Student not found",
    });
  }

  res.status(200).json({
    success: true,
    verified: true,
    student: {
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      currentClass: student.currentClass,
      session: student.session,
    },
  });
};

exports.dashboard = asyncHandler(async (req, res) => {
  const totalStudents = await Student.countDocuments();

  const activeStudents = await Student.countDocuments({
    isActive: true,
  });

  const inactiveStudents = await Student.countDocuments({
    isActive: false,
  });

  const maleStudents = await Student.countDocuments({
    gender: "Male",
    isActive: true,
  });

  const femaleStudents = await Student.countDocuments({
    gender: "Female",
    isActive: true,
  });

  const recentStudents = await Student.find({ isActive: true })
    .select("studentId firstName lastName currentClass createdAt")
    .sort({ createdAt: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    message: "Dashboard statistics retrieved successfully.",
    data: {
      totalStudents,
      activeStudents,
      inactiveStudents,
      maleStudents,
      femaleStudents,
      recentStudents,
    },
  });
});

exports.bulkImportStudents = asyncHandler(async (req, res) => {
  const workbook = XLSX.readFile(req.file.path);

  const sheetName = workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];

  const students = XLSX.utils.sheet_to_json(worksheet);

  // Delete uploaded file after reading it
  fs.unlinkSync(req.file.path);

  const importedStudents = [];
  const skippedStudents = [];

  for (const student of students) {
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
    } = student;

    // Required field validation
    if (
      !firstName ||
      !lastName ||
      !gender ||
      !dateOfBirth ||
      !currentClass ||
      !session
    ) {
      skippedStudents.push({
        student,
        reason: "Missing required fields.",
      });

      continue;
    }

    // Gender validation
    if (!["Male", "Female"].includes(gender)) {
      skippedStudents.push({
        student: {
          firstName,
          lastName,
          gender,
        },
        reason: "Gender must be Male or Female.",
      });

      continue;
    }

    // Duplicate check
    const existingStudent = await Student.findOne({
      firstName: {
        $regex: new RegExp(`^${firstName.trim()}$`, "i"),
      },
      lastName: {
        $regex: new RegExp(`^${lastName.trim()}$`, "i"),
      },
      dateOfBirth: new Date(dateOfBirth),
      isActive: true,
    });

    if (existingStudent) {
      skippedStudents.push({
        student: {
          firstName,
          lastName,
          dateOfBirth,
        },
        existingStudentId: existingStudent.studentId,
        reason: "Student already exists.",
      });

      continue;
    }

    // Generate Student ID
    const studentId = await generateStudentId();

    // Save student
    const newStudent = await Student.create({
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
      createdBy: req.admin._id,
      updatedBy: req.admin._id,
    });

    // Store only useful information in the response
    importedStudents.push({
      studentId: newStudent.studentId,
      firstName: newStudent.firstName,
      lastName: newStudent.lastName,
      currentClass: newStudent.currentClass,
      session: newStudent.session,
    });
  }
  await logActivity({
    adminId: req.admin._id,
    action: "Bulk Import",
    details: `${importedStudents.length} students imported`,
  });

  res.status(201).json({
    success: true,
    message: "Bulk import completed successfully.",
    summary: {
      totalRows: students.length,
      imported: importedStudents.length,
      skipped: skippedStudents.length,
    },
    importedStudents,
    skippedStudents,
  });
});

exports.exportStudents = asyncHandler(async (req, res) => {
  // Get all active students
  const students = await Student.find({ isActive: true })
    .select(
      "studentId firstName lastName otherName gender dateOfBirth currentClass session parentName parentPhone admissionDate",
    )
    .sort({ createdAt: -1 });

  // Convert MongoDB documents to plain objects
  const data = students.map((student) => ({
    StudentID: student.studentId,
    FirstName: student.firstName,
    LastName: student.lastName,
    OtherName: student.otherName,
    Gender: student.gender,
    DateOfBirth: student.dateOfBirth,
    CurrentClass: student.currentClass,
    Session: student.session,
    ParentName: student.parentName,
    ParentPhone: student.parentPhone,
    AdmissionDate: student.admissionDate,
  }));

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Add worksheet
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

  // Generate Excel file
  const filePath = "uploads/Students.xlsx";

  XLSX.writeFile(workbook, filePath);

  await logActivity({
    adminId: req.admin._id,
    action: "Export Students",
    details: `${students.length} students exported`,
  });

  // Download file
  res.download(filePath, "Students.xlsx");
});

exports.getActivityLogs = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find()
    .populate("admin", "fullName email -_id")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: logs.length,
    logs,
  });
});



exports.downloadStudentSlip = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    studentId: req.params.studentId,
  });

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found",
    });
  }

  await generateStudentSlip(student, res);
});



exports.verifyStudentQrcode = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    studentId: req.params.studentId,
    isArchived: false,
  });

  if (!student) {
    return res.status(404).json({
      success: false,
      verified: false,
      message: "Invalid student ID",
    });
  }

  res.status(200).json({
    success: true,
    verified: true,
    student: {
      studentId: student.studentId,
      name: `${student.firstName} ${student.lastName}`,
      gender: student.gender,
      class: student.currentClass,
      session: student.session,
    },
  });
});