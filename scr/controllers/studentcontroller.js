const XLSX = require("xlsx");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");

const Student = require("../models/student");
const StudentCredential = require("../models/StudentCredential");

const generateStudentId = require("../utils/generateStudentID");
const logActivity = require("../utils/logActivity");
const ActivityLog = require("../models/activityLog");
const generateQRCode = require("../utils/generateQRCode");
const generateStudentSlip = require("../utils/generateStudentSlip");
const cloudinary = require("../config/cloudinary");
const parseExcelDate = require("../utils/parseExcelDate");
const createAuditLog = require("../utils/createAuditLog");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Generate a secure temporary student password.
 *
 * This password is returned only when a credential is initially created
 * so the administrator/class teacher can provide it to the student.
 *
 * The student will be required to change it after first login.
 */
const generateTemporaryPassword = () => {
  return crypto.randomBytes(6).toString("base64url").slice(0, 10);
};

/**
 * Escape user input before using it inside a MongoDB regular expression.
 *
 * This prevents characters such as:
 * . * + ? ^ $ { } ( ) | [ ] \
 *
 * from being interpreted as regex operators.
 */
const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Create a StudentCredential for a student.
 *
 * If a password is supplied, it is used.
 * Otherwise, a secure temporary password is generated.
 *
 * The plaintext password is never stored in the database.
 */
const createStudentCredential = async ({ student, password, adminId }) => {
  const existingCredential = await StudentCredential.findOne({
    student: student._id,
  });

  if (existingCredential) {
    const error = new Error(
      "A student login account already exists for this student.",
    );

    error.statusCode = 409;

    throw error;
  }

  const username = student.studentId.toUpperCase();

  const plainPassword =
    password && String(password).trim()
      ? String(password)
      : generateTemporaryPassword();

  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const credential = await StudentCredential.create({
    student: student._id,
    username,
    passwordHash,
    mustChangePassword: true,
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  return {
    credential,
    temporaryPassword: plainPassword,
  };
};

/**
 * Create a credential for a bulk-imported student.
 *
 * Bulk imports do not normally contain passwords, so a secure temporary
 * password is generated for each imported student.
 */
const createBulkStudentCredential = async ({ student, adminId }) => {
  const password = generateTemporaryPassword();

  const passwordHash = await bcrypt.hash(password, 12);

  const credential = await StudentCredential.create({
    student: student._id,
    username: student.studentId.toUpperCase(),
    passwordHash,
    mustChangePassword: true,
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  return {
    credential,
    temporaryPassword: password,
  };
};

/*
|--------------------------------------------------------------------------
| Create Student
|--------------------------------------------------------------------------
*/

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
    password,
  } = req.body;

  /*
  |--------------------------------------------------------------------------
  | Parse Date of Birth
  |--------------------------------------------------------------------------
  */

  const parsedDateOfBirth = parseExcelDate(dateOfBirth);

  if (!parsedDateOfBirth) {
    return res.status(400).json({
      success: false,
      message: "Invalid date of birth format.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Check Duplicate Student
  |--------------------------------------------------------------------------
  |
  | This application-level check handles the normal case.
  |
  | The database-level unique index on:
  |
  | firstName + lastName + dateOfBirth
  |
  | provides the final protection against concurrent requests.
  |
  */

  const escapedFirstName = escapeRegex(firstName.trim());
  const escapedLastName = escapeRegex(lastName.trim());

  const existingStudent = await Student.findOne({
    firstName: {
      $regex: new RegExp(`^${escapedFirstName}$`, "i"),
    },

    lastName: {
      $regex: new RegExp(`^${escapedLastName}$`, "i"),
    },

    dateOfBirth: parsedDateOfBirth,

    isActive: true,
  });

  if (existingStudent) {
    return res.status(409).json({
      success: false,
      message: "A student with these details already exists.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Generate Student ID
  |--------------------------------------------------------------------------
  */

  const studentId = await generateStudentId();

  /*
  |--------------------------------------------------------------------------
  | Create Student
  |--------------------------------------------------------------------------
  |
  | The compound unique index protects this operation against a race
  | condition where two identical registrations pass the duplicate
  | check at almost the same time.
  |
  */

  let student;

  try {
    student = await Student.create({
      studentId,

      firstName,

      lastName,

      otherName,

      gender,

      dateOfBirth: parsedDateOfBirth,

      currentClass,

      session,

      admissionDate: new Date(),

      parentName,

      parentPhone,

      createdBy: req.admin._id,

      updatedBy: req.admin._id,
    });
  } catch (error) {
    /*
     * MongoDB duplicate-key error.
     *
     * This occurs when another concurrent request created an
     * active student with the same first name, last name,
     * and date of birth between our duplicate check and
     * Student.create().
     */

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A student with these details already exists.",
      });
    }

    throw error;
  }

  /*
  |--------------------------------------------------------------------------
  | Create Student Login Credential
  |--------------------------------------------------------------------------
  */

  let credentialResult;

  try {
    credentialResult = await createStudentCredential({
      student,
      password,
      adminId: req.admin._id,
    });
  } catch (error) {
    /*
     * Roll back the student if credential creation fails.
     * This prevents students from existing without login credentials.
     */

    await Student.deleteOne({
      _id: student._id,
    });

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  }

  /*
  |--------------------------------------------------------------------------
  | Audit Log
  |--------------------------------------------------------------------------
  */

  await createAuditLog({
    user: req.admin._id,

    action: "CREATE",

    module: "STUDENT",

    description:
      `${req.admin.fullName} created student ` +
      `${student.firstName} ${student.lastName}`,

    req,
  });

  /*
  |--------------------------------------------------------------------------
  | Activity Log
  |--------------------------------------------------------------------------
  */

  await logActivity({
    adminId: req.admin._id,

    action: "CREATE_STUDENT",

    studentId: student.studentId,

    details: `Created student ${student.firstName} ${student.lastName}`,
  });

  /*
  |--------------------------------------------------------------------------
  | Response
  |--------------------------------------------------------------------------
  */

  return res.status(201).json({
    success: true,

    message: "Student created successfully.",

    student,

    studentCredential: {
      username: credentialResult.credential.username,

      temporaryPassword: credentialResult.temporaryPassword,

      mustChangePassword: credentialResult.credential.mustChangePassword,
    },
  });
});

/*
|--------------------------------------------------------------------------
| Get Students
|--------------------------------------------------------------------------
*/

exports.getStudents = asyncHandler(async (req, res) => {
  /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

  const requestedPage = Number(req.query.page);

  const requestedLimit = Number(req.query.limit);

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 10;

  const search = req.query.search || "";

  const currentClass = req.query.class || "";

  const gender = req.query.gender || "";

  const session = req.query.session || "";

  const status = req.query.status || "";

  const skip = (page - 1) * limit;

  const query = {};

  /*
  |--------------------------------------------------------------------------
  | Default Status
  |--------------------------------------------------------------------------
  */

  if (!status) {
    query.isActive = true;
  }

  /*
  |--------------------------------------------------------------------------
  | Status Filter
  |--------------------------------------------------------------------------
  */

  if (status === "active") {
    query.isActive = true;
  }

  if (status === "archived") {
    query.isActive = false;
  }

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  if (search) {
    const escapedSearch = escapeRegex(search);

    query.$or = [
      {
        firstName: {
          $regex: escapedSearch,
          $options: "i",
        },
      },

      {
        lastName: {
          $regex: escapedSearch,
          $options: "i",
        },
      },

      {
        otherName: {
          $regex: escapedSearch,
          $options: "i",
        },
      },

      {
        studentId: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
    ];
  }

  /*
  |--------------------------------------------------------------------------
  | Class Filter
  |--------------------------------------------------------------------------
  */

  if (currentClass) {
    query.currentClass = currentClass;
  }

  /*
  |--------------------------------------------------------------------------
  | Gender Filter
  |--------------------------------------------------------------------------
  */

  if (gender) {
    query.gender = gender;
  }

  /*
  |--------------------------------------------------------------------------
  | Session Filter
  |--------------------------------------------------------------------------
  */

  if (session) {
    query.session = session;
  }

  /*
  |--------------------------------------------------------------------------
  | Fetch Students
  |--------------------------------------------------------------------------
  */

  const students = await Student.find(query).skip(skip).limit(limit).sort({
    createdAt: -1,
  });

  const totalStudents = await Student.countDocuments(query);

  return res.status(200).json({
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

/*
|--------------------------------------------------------------------------
| Get Single Student
|--------------------------------------------------------------------------
*/

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

  return res.status(200).json({
    success: true,

    student,
  });
});

/*
|--------------------------------------------------------------------------
| Update Student
|--------------------------------------------------------------------------
*/

exports.updateStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  /*
   * Only these fields are allowed to be updated
   * through the student update endpoint.
   */
  const allowedFields = [
    "firstName",
    "lastName",
    "otherName",
    "gender",
    "dateOfBirth",
    "currentClass",
    "session",
    "parentName",
    "parentPhone",
  ];

  const updateData = {};

  /*
   * Build the update object from the whitelist.
   *
   * This prevents system-controlled fields such as:
   * studentId, isActive, createdBy, photo, password,
   * passwordHash, username, etc. from being modified here.
   */
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updateData[field] = req.body[field];
    }
  }

  /*
   * At least one editable field must be supplied.
   */
  if (Object.keys(updateData).length === 0) {
    res.status(400);

    throw new Error("At least one student field must be provided for update.");
  }

  const student = await Student.findOneAndUpdate(
    {
      studentId,
    },

    {
      $set: {
        ...updateData,

        updatedBy: req.admin._id,
      },
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

  /*
  |--------------------------------------------------------------------------
  | Audit Log
  |--------------------------------------------------------------------------
  */

  await createAuditLog({
    user: req.admin._id,

    action: "UPDATE",

    module: "STUDENT",

    description:
      `${req.admin.fullName} updated student ` +
      `${student.firstName} ${student.lastName}`,

    req,
  });

  /*
  |--------------------------------------------------------------------------
  | Activity Log
  |--------------------------------------------------------------------------
  */

  await logActivity({
    adminId: req.admin._id,

    action: "UPDATE_STUDENT",

    studentId: student.studentId,

    details: `${student.firstName} ${student.lastName}`,
  });

  return res.status(200).json({
    success: true,

    message: "Student updated successfully.",

    student,
  });
});

/*
|--------------------------------------------------------------------------
| Delete / Archive Student
|--------------------------------------------------------------------------
*/

exports.deleteStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findOneAndUpdate(
    {
      studentId,
    },

    {
      isActive: false,
    },

    {
      returnDocument: "after",
    },
  );

  if (!student) {
    return res.status(404).json({
      success: false,

      message: "Student not found.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Disable Student Login
  |--------------------------------------------------------------------------
  */

  await StudentCredential.findOneAndUpdate(
    {
      student: student._id,
    },

    {
      isActive: false,

      updatedBy: req.admin._id,
    },
  );

  /*
  |--------------------------------------------------------------------------
  | Audit Log
  |--------------------------------------------------------------------------
  */

  await createAuditLog({
    user: req.admin._id,

    action: "ARCHIVE",

    module: "STUDENT",

    description:
      `${req.admin.fullName} archived student ` +
      `${student.firstName} ${student.lastName}`,

    req,
  });

  /*
  |--------------------------------------------------------------------------
  | Activity Log
  |--------------------------------------------------------------------------
  */

  await logActivity({
    adminId: req.admin._id,

    action: "ARCHIVE_STUDENT",

    studentId: student.studentId,

    details: `${student.firstName} ${student.lastName}`,
  });

  return res.status(200).json({
    success: true,

    message: "Student archived successfully",
  });
});

/*
|--------------------------------------------------------------------------
| Restore Student
|--------------------------------------------------------------------------
*/

exports.restoreStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findOne({
    studentId,
  });

  if (!student) {
    res.status(404);

    throw new Error("Student not found.");
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Student Login Credential
  |--------------------------------------------------------------------------
  */

  const credential = await StudentCredential.findOne({
    student: student._id,
  });

  if (!credential) {
    res.status(409);

    throw new Error(
      "Student cannot be restored because the login credential is missing.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Restore Student
  |--------------------------------------------------------------------------
  */

  student.isActive = true;
  student.updatedBy = req.admin._id;

  await student.save();

  /*
  |--------------------------------------------------------------------------
  | Reactivate Student Login
  |--------------------------------------------------------------------------
  */

  credential.isActive = true;
  credential.updatedBy = req.admin._id;

  await credential.save();

  /*
  |--------------------------------------------------------------------------
  | Audit Log
  |--------------------------------------------------------------------------
  */

  await createAuditLog({
    user: req.admin._id,

    action: "RESTORE",

    module: "STUDENT",

    description:
      `${req.admin.fullName} restored student ` +
      `${student.firstName} ${student.lastName}`,

    req,
  });

  /*
  |--------------------------------------------------------------------------
  | Activity Log
  |--------------------------------------------------------------------------
  */

  await logActivity({
    adminId: req.admin._id,

    action: "RESTORE_STUDENT",

    studentId: student.studentId,

    details: `${student.firstName} ${student.lastName}`,
  });

  return res.status(200).json({
    success: true,

    message: "Student restored successfully",
  });
});

/*
|--------------------------------------------------------------------------
| Get Archived Students
|--------------------------------------------------------------------------
*/

exports.getArchivedStudents = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const skip = (page - 1) * limit;

  const [students, totalStudents] = await Promise.all([
    Student.find({
      isActive: false,
    })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit),

    Student.countDocuments({
      isActive: false,
    }),
  ]);

  const totalPages = Math.ceil(totalStudents / limit);

  return res.status(200).json({
    success: true,

    totalStudents,

    page,

    limit,

    totalPages,

    students,
  });
});

/*
|--------------------------------------------------------------------------
| Verify Student
|--------------------------------------------------------------------------
*/

exports.verifyStudent = async (req, res) => {
  try {
    const student = await Student.findOne({
      studentId: req.params.studentId,
    });

    if (!student || student.isActive === false) {
      return res.status(404).json({
        success: false,

        verified: false,

        exists: false,

        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,

      verified: true,

      student: {
        studentId: student.studentId,

        firstName: student.firstName,

        lastName: student.lastName,

        otherName: student.otherName,

        gender: student.gender,

        currentClass: student.currentClass,

        session: student.session,

        photo: student.photo,
      },
    });
  } catch (error) {
    console.error("Student verification error:", error);

    return res.status(500).json({
      success: false,

      message: "Unable to verify student at this time",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

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

  const recentStudents = await Student.find({
    isActive: true,
  })
    .select("studentId firstName lastName currentClass createdAt")
    .sort({
      createdAt: -1,
    })
    .limit(5);

  return res.status(200).json({
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

/*
|--------------------------------------------------------------------------
| Bulk Import Students
|--------------------------------------------------------------------------
*/

exports.bulkImportStudents = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please upload an Excel file.",
    });
  }

  const workbook = XLSX.readFile(req.file.path);

  const sheetName = workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];

  const students = XLSX.utils.sheet_to_json(worksheet);

  /*
  |--------------------------------------------------------------------------
  | Delete Uploaded File
  |--------------------------------------------------------------------------
  */

  try {
    fs.unlinkSync(req.file.path);
  } catch (error) {
    console.log("Uploaded file deletion error:", error.message);
  }

  const importedStudents = [];

  const skippedStudents = [];

  /*
  |--------------------------------------------------------------------------
  | Process Each Student
  |--------------------------------------------------------------------------
  */

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

    /*
    |--------------------------------------------------------------------------
    | Required Fields
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Parse Date
    |--------------------------------------------------------------------------
    */

    const parsedDateOfBirth = parseExcelDate(dateOfBirth);

    if (!parsedDateOfBirth) {
      skippedStudents.push({
        student,
        reason: "Invalid date of birth format.",
      });

      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Gender Validation
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Duplicate Check
    |--------------------------------------------------------------------------
    */

    const startOfDay = new Date(parsedDateOfBirth);

    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(parsedDateOfBirth);

    endOfDay.setHours(23, 59, 59, 999);

    const escapedFirstName = escapeRegex(firstName.trim());

    const escapedLastName = escapeRegex(lastName.trim());

    const existingStudent = await Student.findOne({
      firstName: {
        $regex: new RegExp(`^${escapedFirstName}$`, "i"),
      },

      lastName: {
        $regex: new RegExp(`^${escapedLastName}$`, "i"),
      },

      dateOfBirth: {
        $gte: startOfDay,
        $lte: endOfDay,
      },

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

    /*
    |--------------------------------------------------------------------------
    | Generate Student ID
    |--------------------------------------------------------------------------
    */

    const studentId = await generateStudentId();

    /*
    |--------------------------------------------------------------------------
    | Create Student
    |--------------------------------------------------------------------------
    */

    let newStudent;

    let newCredential;

    try {
      newStudent = await Student.create({
        studentId,

        firstName,

        lastName,

        otherName,

        gender,

        dateOfBirth: parsedDateOfBirth,

        currentClass,

        session,

        parentName,

        parentPhone,

        createdBy: req.admin._id,

        updatedBy: req.admin._id,
      });

      /*
      |--------------------------------------------------------------------------
      | Create Student Credential
      |--------------------------------------------------------------------------
      */

      const credentialResult = await createBulkStudentCredential({
        student: newStudent,

        adminId: req.admin._id,
      });

      newCredential = credentialResult.credential;

      /*
      |--------------------------------------------------------------------------
      | Store Imported Student
      |--------------------------------------------------------------------------
      |
      | IMPORTANT:
      |
      | The temporary plaintext password is intentionally NOT returned.
      |
      | The credential is still created using the generated password,
      | but the password itself is never included in the API response.
      |
      */

      importedStudents.push({
        studentId: newStudent.studentId,

        firstName: newStudent.firstName,

        lastName: newStudent.lastName,

        currentClass: newStudent.currentClass,

        session: newStudent.session,

        username: credentialResult.credential.username,

        mustChangePassword: credentialResult.credential.mustChangePassword,
      });
    } catch (error) {
      /*
      |--------------------------------------------------------------------------
      | Roll Back Credential
      |--------------------------------------------------------------------------
      */

      if (newCredential?._id) {
        try {
          await StudentCredential.deleteOne({
            _id: newCredential._id,
          });
        } catch (rollbackError) {
          console.log(
            "Bulk import credential rollback error:",
            rollbackError.message,
          );
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Roll Back Student
      |--------------------------------------------------------------------------
      */

      if (newStudent?._id) {
        try {
          await Student.deleteOne({
            _id: newStudent._id,
          });
        } catch (rollbackError) {
          console.log(
            "Bulk import student rollback error:",
            rollbackError.message,
          );
        }
      }

      skippedStudents.push({
        student: {
          firstName,
          lastName,
          gender,
          currentClass,
          session,
        },

        reason: error.message || "Unable to create student account.",
      });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Activity Log
  |--------------------------------------------------------------------------
  */

  await logActivity({
    adminId: req.admin._id,

    action: "BULK_IMPORT_STUDENTS",

    details: `${importedStudents.length} students imported`,
  });

  /*
  |--------------------------------------------------------------------------
  | Response
  |--------------------------------------------------------------------------
  */

  return res.status(201).json({
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

/*
|--------------------------------------------------------------------------
| Export Students
|--------------------------------------------------------------------------
*/

exports.exportStudents = asyncHandler(async (req, res) => {
  const { search, class: currentClass, gender, session, status } = req.query;

  const MAX_EXPORT_ROWS = 10000;

  const query = {};

  /*
  |--------------------------------------------------------------------------
  | Default: Active Students
  |--------------------------------------------------------------------------
  */

  if (!status) {
    query.isActive = true;
  }

  if (status === "active") {
    query.isActive = true;
  }

  if (status === "archived") {
    query.isActive = false;
  }

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  if (search) {
    const escapedSearch = escapeRegex(search);

    query.$or = [
      {
        firstName: {
          $regex: escapedSearch,
          $options: "i",
        },
      },

      {
        lastName: {
          $regex: escapedSearch,
          $options: "i",
        },
      },

      {
        otherName: {
          $regex: escapedSearch,
          $options: "i",
        },
      },

      {
        studentId: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
    ];
  }

  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

  if (currentClass) {
    query.currentClass = currentClass;
  }

  if (gender) {
    query.gender = gender;
  }

  if (session) {
    query.session = session;
  }

  /*
  |--------------------------------------------------------------------------
  | Fetch Students
  |--------------------------------------------------------------------------
  |
  | Fetch one extra record so we can determine whether the export would
  | exceed the maximum allowed number of rows.
  |
  */

  const students = await Student.find(query)
    .select(
      "studentId firstName lastName otherName gender dateOfBirth currentClass session parentName parentPhone admissionDate",
    )
    .sort({
      createdAt: -1,
    })
    .limit(MAX_EXPORT_ROWS + 1);

  /*
  |--------------------------------------------------------------------------
  | Prevent Oversized Exports
  |--------------------------------------------------------------------------
  */

  if (students.length > MAX_EXPORT_ROWS) {
    return res.status(413).json({
      success: false,
      message:
        `Export is too large. Please narrow your filters to ` +
        `no more than ${MAX_EXPORT_ROWS} students.`,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Convert to Excel Data
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Create Workbook
  |--------------------------------------------------------------------------
  */

  const workbook = XLSX.utils.book_new();

  const worksheet = XLSX.utils.json_to_sheet(data);

  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

  /*
  |--------------------------------------------------------------------------
  | Create Unique Temporary Export File
  |--------------------------------------------------------------------------
  */

  const fileName = `Students-${crypto.randomUUID()}.xlsx`;

  const filePath = `uploads/${fileName}`;

  try {
    XLSX.writeFile(workbook, filePath);

    /*
    |--------------------------------------------------------------------------
    | Activity Log
    |--------------------------------------------------------------------------
    */

    await logActivity({
      adminId: req.admin._id,

      action: "EXPORT_STUDENTS",

      details: `${students.length} students exported`,
    });

    /*
    |--------------------------------------------------------------------------
    | Download
    |--------------------------------------------------------------------------
    */

    return res.download(filePath, "Students.xlsx", (error) => {
      /*
      |--------------------------------------------------------------------------
      | Clean Up Temporary Export File
      |--------------------------------------------------------------------------
      */

      fs.unlink(filePath, (unlinkError) => {
        if (unlinkError) {
          console.log("Export file cleanup error:", unlinkError.message);
        }
      });

      /*
      |--------------------------------------------------------------------------
      | Handle Download Error
      |--------------------------------------------------------------------------
      */

      if (error) {
        console.log("Student export download error:", error.message);

        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Unable to download exported student data.",
          });
        }
      }
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Clean Up File If Export Preparation Fails
    |--------------------------------------------------------------------------
    */

    fs.unlink(filePath, (unlinkError) => {
      if (unlinkError && unlinkError.code !== "ENOENT") {
        console.log("Export file cleanup error:", unlinkError.message);
      }
    });

    throw error;
  }
});

/*
|--------------------------------------------------------------------------
| Activity Logs
|--------------------------------------------------------------------------
*/

exports.getActivityLogs = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const skip = (page - 1) * limit;

  const [logs, totalLogs] = await Promise.all([
    ActivityLog.find()
      .populate("admin", "fullName email -_id")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit),

    ActivityLog.countDocuments(),
  ]);

  const totalPages = Math.ceil(totalLogs / limit);

  return res.status(200).json({
    success: true,

    count: totalLogs,

    page,

    limit,

    totalPages,

    logs,
  });
});

/*
|--------------------------------------------------------------------------
| Download Student Slip
|--------------------------------------------------------------------------
*/

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

  return generateStudentSlip(student, res);
});

/*
|--------------------------------------------------------------------------
| Verify Student QR Code
|--------------------------------------------------------------------------
*/

exports.verifyStudentQrcode = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    studentId: req.params.studentId,
    isActive: true,
  });

  if (!student) {
    return res.status(404).json({
      success: false,
      verified: false,
      message: "Invalid student ID",
    });
  }

  return res.status(200).json({
    success: true,
    verified: true,
    student: {
      studentId: student.studentId,

      name: [student.firstName, student.otherName, student.lastName]
        .filter(Boolean)
        .join(" "),

      firstName: student.firstName,

      lastName: student.lastName,

      otherName: student.otherName,

      gender: student.gender,

      // Keep both fields for compatibility
      class: student.currentClass,

      currentClass: student.currentClass,

      session: student.session,

      photo: student.photo,
    },
  });
});

/*
|--------------------------------------------------------------------------
| Generate Student QR Code
|--------------------------------------------------------------------------
*/

exports.generateStudentQRCode = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findOne({
    studentId,

    isActive: true,
  });

  if (!student) {
    res.status(404);

    throw new Error("Student not found.");
  }

  const qrCode = await generateQRCode(student.studentId);

  return res.status(200).json({
    success: true,

    qrCode,
  });
});

/*
|--------------------------------------------------------------------------
| Upload Student Photo
|--------------------------------------------------------------------------
*/

exports.uploadStudentPhoto = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  if (!req.file) {
    res.status(400);

    throw new Error("Please upload a photo.");
  }

  const student = await Student.findOne({
    studentId,
  });

  if (!student) {
    res.status(404);

    throw new Error("Student not found.");
  }

  /*
  |--------------------------------------------------------------------------
  | Preserve Previous Cloudinary Image
  |--------------------------------------------------------------------------
  |
  | Do not delete the old image yet.
  |
  | The new image has already been uploaded by the upload middleware.
  | We first save the new image reference to MongoDB. Only after that
  | succeeds do we delete the old Cloudinary image.
  |
  | This prevents the database from pointing to an image that has already
  | been deleted if the database save fails.
  |
  */

  const previousPhoto = student.photo
    ? {
        url: student.photo.url || "",
        publicId: student.photo.publicId || "",
      }
    : {
        url: "",
        publicId: "",
      };

  /*
  |--------------------------------------------------------------------------
  | Save New Image Reference
  |--------------------------------------------------------------------------
  */

  student.photo = {
    url: req.file.path,

    publicId: req.file.filename,
  };

  try {
    await student.save();
  } catch (error) {
    /*
     * The new Cloudinary image is no longer referenced by MongoDB.
     *
     * Delete it to prevent an orphaned Cloudinary image.
     *
     * The old image remains untouched because we have not deleted it yet.
     */
    if (req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (cleanupError) {
        console.log(
          "New Cloudinary image cleanup error:",
          cleanupError.message,
        );
      }
    }

    throw error;
  }

  /*
  |--------------------------------------------------------------------------
  | Delete Previous Cloudinary Image
  |--------------------------------------------------------------------------
  |
  | At this point MongoDB successfully references the new image.
  |
  | If deletion of the old image fails, the database remains consistent:
  | it still points to the new image. The old Cloudinary image may remain
  | temporarily and can be cleaned up later.
  |
  */

  if (
    previousPhoto.publicId &&
    previousPhoto.publicId !== student.photo.publicId
  ) {
    try {
      await cloudinary.uploader.destroy(previousPhoto.publicId);
    } catch (error) {
      console.log("Previous Cloudinary delete error:", error.message);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Activity Log
  |--------------------------------------------------------------------------
  */

  await logActivity({
    adminId: req.admin._id,

    action: "UPLOAD_STUDENT_PHOTO",

    studentId: student.studentId,

    details: `${student.firstName} ${student.lastName}`,
  });

  return res.status(200).json({
    success: true,

    message: "Student photo uploaded successfully.",

    photo: student.photo,
  });
});

/*
|--------------------------------------------------------------------------
| Monthly Registration Analytics
|--------------------------------------------------------------------------
*/

exports.monthlyRegistrationAnalytics = asyncHandler(async (req, res) => {
  const currentYear = new Date().getFullYear();

  const analytics = await Student.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(`${currentYear}-01-01`),
          $lt: new Date(`${currentYear + 1}-01-01`),
        },
      },
    },

    {
      $group: {
        _id: {
          month: {
            $month: "$createdAt",
          },
        },

        count: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        "_id.month": 1,
      },
    },
  ]);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const formattedData = months.map((month, index) => {
    const found = analytics.find((item) => item._id.month === index + 1);

    return {
      month,
      count: found ? found.count : 0,
    };
  });

  return res.status(200).json({
    success: true,
    year: currentYear,
    data: formattedData,
  });
});

/*
|--------------------------------------------------------------------------
| Class Analytics
|--------------------------------------------------------------------------
*/

exports.classAnalytics = asyncHandler(async (req, res) => {
  const data = await Student.aggregate([
    {
      $match: {
        isActive: true,
      },
    },

    {
      $group: {
        _id: "$currentClass",

        count: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  return res.status(200).json({
    success: true,

    data,
  });
});
