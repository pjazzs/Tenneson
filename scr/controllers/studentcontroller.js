const XLSX = require("xlsx");
const fs = require("fs");
const asyncHandler = require("express-async-handler");
const Student = require("../models/student");
const generateStudentId = require("../utils/generateStudentID");
const logActivity = require("../utils/logActivity");
const ActivityLog = require("../models/activityLog");
const generateQRCode = require("../utils/generateQRCode");
const generateStudentSlip = require("../utils/generateStudentSlip");
const cloudinary = require("../config/cloudinary");
const parseExcelDate = require("../utils/parseExcelDate");
const createAuditLog = require("../utils/createAuditLog");

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



  // Parse date of birth

  const parsedDateOfBirth = parseExcelDate(
    dateOfBirth
  );



  if (!parsedDateOfBirth) {

    return res.status(400).json({

      success: false,

      message:
        "Invalid date of birth format.",

    });

  }





  // Check duplicate student

  const existingStudent =
    await Student.findOne({

      firstName: {

        $regex:
          new RegExp(
            `^${firstName.trim()}$`,
            "i"
          ),

      },


      lastName: {

        $regex:
          new RegExp(
            `^${lastName.trim()}$`,
            "i"
          ),

      },


      dateOfBirth:
        parsedDateOfBirth,


      isActive: true,

    });





  if (existingStudent) {

    res.status(409);

    throw new Error(
      "A student with these details already exists."
    );

  }





  // Generate Student ID

  const studentId =
    await generateStudentId();






  // Create student

  const student =
    await Student.create({

      studentId,


      firstName,


      lastName,


      otherName,


      gender,


      dateOfBirth:
        parsedDateOfBirth,


      currentClass,


      session,


      admissionDate:
        new Date(),


      parentName,


      parentPhone,


      createdBy:
        req.admin._id,


      updatedBy:
        req.admin._id,

    });








  // Audit log

  await createAuditLog({

    adminId:
      req.admin._id,


    action:
      "CREATE",


    module:
      "STUDENT",


    description:
      `${req.admin.fullName} created student ${student.firstName} ${student.lastName}`,


    req,

  });






  // Activity log

  await logActivity({

    adminId:
      req.admin._id,


    action:
      "CREATE_STUDENT",


    studentId:
      student.studentId,


    details:
      `Created student ${student.firstName} ${student.lastName}`,

  });








  res.status(201).json({

    success: true,


    message:
      "Student created successfully.",


    student,

  });



});

exports.getStudents = asyncHandler(async (req, res) => {

  const page = Number(req.query.page) || 1;

  const limit = Number(req.query.limit) || 10;


  const search = req.query.search || "";

  const currentClass = req.query.class || "";

  const gender = req.query.gender || "";

  const session = req.query.session || "";

  const status = req.query.status || "";



  const skip = (page - 1) * limit;




  const query = {};




  /*
    Default behaviour:
    If no status filter is provided,
    show only active students
  */

  if (!status) {

    query.isActive = true;

  }




  /*
    Status Filter
  */

  if (status === "active") {

    query.isActive = true;

  }


  if (status === "archived") {

    query.isActive = false;

  }






  /*
    Search by:
    - First Name
    - Last Name
    - Other Name
    - Student ID
  */

  if (search) {


    query.$or = [


      {
        firstName: {
          $regex: search,
          $options: "i",
        },
      },


      {
        lastName: {
          $regex: search,
          $options: "i",
        },
      },


      {
        otherName: {
          $regex: search,
          $options: "i",
        },
      },


      {
        studentId: {
          $regex: search,
          $options: "i",
        },
      },


    ];


  }







  /*
    Class Filter
  */

  if (currentClass) {

    query.currentClass = currentClass;

  }





  /*
    Gender Filter
  */

  if (gender) {

    query.gender = gender;

  }






  /*
    Session Filter
  */

  if (session) {

    query.session = session;

  }







  const students = await Student.find(query)

    .skip(skip)

    .limit(limit)

    .sort({
      createdAt: -1,
    });







  const totalStudents = await Student.countDocuments(query);






  res.status(200).json({


    success: true,


    students,



    pagination: {


      currentPage: page,


      limit,


      totalStudents,


      totalPages: Math.ceil(
        totalStudents / limit
      ),


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

  await createAuditLog({

adminId: req.admin._id,

action:"UPDATE",

module:"STUDENT",

description:
`${req.admin.fullName} updated student ${student.firstName} ${student.lastName}`,

req,

});

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

exports.deleteStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findOneAndUpdate(
    { studentId },
    { isActive: false },
    { returnDocument: "after" }
  );

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found.",
    });
  }

  // Create audit log
  await createAuditLog({
    user: req.admin._id,
    action: "ARCHIVE",
    module: "STUDENT",
    description: `${req.admin.fullName} archived student ${student.firstName} ${student.lastName}`,
    req,
  });

  // Create student activity log
  await logActivity({
    adminId: req.admin._id,
    action: "DELETE_STUDENT",
    studentId: student.studentId,
    details: `${student.firstName} ${student.lastName}`,
  });

  return res.status(200).json({
    success: true,
    message: "Student archived successfully",
  });
});

exports.restoreStudent = asyncHandler(async (req, res) => {

  const { studentId } = req.params;


  const student = await Student.findOneAndUpdate(

    { studentId },

    { isActive: true },

    { returnDocument: "after" }

  );



  if (!student) {

    res.status(404);

    throw new Error("Student not found.");

  }



  await logActivity({

    adminId: req.admin._id,

    action: "RESTORE_STUDENT",

    studentId: student.studentId,

    details: `${student.firstName} ${student.lastName}`,

  });



  res.status(200).json({

    success: true,

    message: "Student restored successfully",

  });


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



    res.status(200).json({

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


  } catch(error) {

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }
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

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please upload an Excel file.",
    });
  }



  const workbook = XLSX.readFile(req.file.path);


  const sheetName = workbook.SheetNames[0];


  const worksheet = workbook.Sheets[sheetName];


  const students = XLSX.utils.sheet_to_json(
    worksheet
  );



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





    // Parse date from Excel

    const parsedDateOfBirth = parseExcelDate(
      dateOfBirth
    );




    if (!parsedDateOfBirth) {


      skippedStudents.push({

        student,

        reason: "Invalid date of birth format.",

      });


      continue;

    }






    // Gender validation

    if (
      !["Male", "Female"].includes(gender)
    ) {


      skippedStudents.push({

        student: {

          firstName,

          lastName,

          gender,

        },

        reason:
          "Gender must be Male or Female.",

      });


      continue;

    }








    // Duplicate check

   const startOfDay = new Date(parsedDateOfBirth);
startOfDay.setHours(0, 0, 0, 0);

const endOfDay = new Date(parsedDateOfBirth);
endOfDay.setHours(23, 59, 59, 999);

const existingStudent = await Student.findOne({
  firstName: {
    $regex: new RegExp(
      `^${firstName.trim()}$`,
      "i"
    ),
  },

  lastName: {
    $regex: new RegExp(
      `^${lastName.trim()}$`,
      "i"
    ),
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


        existingStudentId:
          existingStudent.studentId,


        reason:
          "Student already exists.",

      });


      continue;

    }








    // Generate Student ID

    const studentId =
      await generateStudentId();






    // Create student

    const newStudent =
      await Student.create({

        studentId,


        firstName,


        lastName,


        otherName,


        gender,


        dateOfBirth:
          parsedDateOfBirth,


        currentClass,


        session,


        parentName,


        parentPhone,


        createdBy:
          req.admin._id,


        updatedBy:
          req.admin._id,

      });







    // Store imported student information

    importedStudents.push({

      studentId:
        newStudent.studentId,


      firstName:
        newStudent.firstName,


      lastName:
        newStudent.lastName,


      currentClass:
        newStudent.currentClass,


      session:
        newStudent.session,

    });



  }





  await logActivity({

    adminId:
      req.admin._id,


    action:
      "Bulk Import",


    details:
      `${importedStudents.length} students imported`,

  });







  res.status(201).json({

    success: true,


    message:
      "Bulk import completed successfully.",



    summary: {

      totalRows:
        students.length,


      imported:
        importedStudents.length,


      skipped:
        skippedStudents.length,

    },


    importedStudents,


    skippedStudents,

  });



});

exports.exportStudents = asyncHandler(async (req, res) => {

  const {
    search,
    class: currentClass,
    gender,
    session,
    status,
  } = req.query;



  const query = {};



  /*
    Default:
    export active students only
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





  // Search filter

  if (search) {

    query.$or = [

      {
        firstName: {
          $regex: search,
          $options: "i",
        },
      },

      {
        lastName: {
          $regex: search,
          $options: "i",
        },
      },

      {
        otherName: {
          $regex: search,
          $options: "i",
        },
      },

      {
        studentId: {
          $regex: search,
          $options: "i",
        },
      },

    ];

  }





  if (currentClass) {

    query.currentClass = currentClass;

  }



  if (gender) {

    query.gender = gender;

  }



  if (session) {

    query.session = session;

  }





  const students = await Student.find(query)

    .select(
      "studentId firstName lastName otherName gender dateOfBirth currentClass session parentName parentPhone admissionDate"
    )

    .sort({
      createdAt: -1,
    });





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





  const workbook = XLSX.utils.book_new();


  const worksheet =
    XLSX.utils.json_to_sheet(data);



  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Students"
  );



  const filePath =
    "uploads/Students.xlsx";



  XLSX.writeFile(
    workbook,
    filePath
  );



  await logActivity({

    adminId:req.admin._id,

    action:"Export Students",

    details:`${students.length} students exported`

  });




  res.download(
    filePath,
    "Students.xlsx"
  );


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

  return generateStudentSlip(student, res);
});



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
      firstName: student.firstName,
      lastName: student.lastName,
      otherName: student.otherName,
      gender: student.gender,
      currentClass: student.currentClass,
      session: student.session,
      photo: student.photo,
    },
  });
});


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



  const qrCode = await generateQRCode(
    student.studentId
  );



  res.status(200).json({

    success:true,

    qrCode,

  });


});


exports.uploadStudentPhoto = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  if (!req.file) {
    res.status(400);
    throw new Error("Please upload a photo.");
  }

  const student = await Student.findOne({ studentId });

  if (!student) {
    res.status(404);
    throw new Error("Student not found.");
  }

  // ===========================
  // Delete previous Cloudinary image
  // ===========================

  if (student.photo?.publicId) {
    try {
      await cloudinary.uploader.destroy(student.photo.publicId);
    } catch (error) {
      console.log(
        "Cloudinary delete error:",
        error.message
      );
    }
  }

  // ===========================
  // Save new image
  // ===========================

  student.photo = {
    url: req.file.path,
    publicId: req.file.filename,
  };

  await student.save();

  await logActivity({
    adminId: req.admin._id,
    action: "UPLOAD_STUDENT_PHOTO",
    studentId: student.studentId,
    details: `${student.firstName} ${student.lastName}`,
  });

  res.status(200).json({
    success: true,
    message: "Student photo uploaded successfully.",
    photo: student.photo,
  });
});


exports.monthlyRegistrationAnalytics = asyncHandler(async (req, res) => {

  const currentYear = new Date().getFullYear();


  const analytics = await Student.aggregate([

    {
      $match: {
        createdAt: {
          $gte: new Date(`${currentYear}-01-01`),
          $lte: new Date(`${currentYear}-12-31`),
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



  const formattedData = months.map(
    (month, index) => {

      const found = analytics.find(
        (item) =>
          item._id.month === index + 1
      );


      return {

        month,

        count: found
          ? found.count
          : 0,

      };

    }
  );



  res.status(200).json({

    success: true,

    year: currentYear,

    data: formattedData,

  });


});

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

  res.status(200).json({
    success: true,
    data,
  });

});