const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");

const Student = require("../models/student");
const Result = require("../models/Result");
const AcademicSession = require("../models/AcademicSession");
const Promotion = require("../models/Promotion");

const logActivity = require("../utils/logActivity");
const createAuditLog = require("../utils/createAuditLog");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Derive the next academic session.
 *
 * Example:
 * 2025/2026 -> 2026/2027
 */
const getNextSessionName = (sessionName) => {
  const match = String(sessionName).match(/^(\d{4})\/(\d{4})$/);

  if (!match) {
    const error = new Error(
      "The academic session name must use the format YYYY/YYYY.",
    );

    error.statusCode = 400;

    throw error;
  }

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);

  if (endYear !== startYear + 1) {
    const error = new Error("Invalid academic session name.");

    error.statusCode = 400;

    throw error;
  }

  return `${startYear + 1}/${endYear + 1}`;
};

/**
 * Determine the next class after promotion.
 *
 * SS3 intentionally has no next class because graduation
 * is handled separately in applyPromotion().
 */
const getNextClass = (currentClass) => {
  const progression = {
    JSS1: "JSS2",
    JSS2: "JSS3",
    JSS3: "SS1",
    SS1: "SS2",
    SS2: "SS3",
  };

  return progression[currentClass] || null;
};

/*
|--------------------------------------------------------------------------
| Apply Promotion
|--------------------------------------------------------------------------
*/

/**
 * Apply the Principal's final decision from a third-term result.
 *
 * The Result remains historical and is never modified here.
 *
 * For promoted students:
 *   Student moves to the next class and next session.
 *
 * For repeating students:
 *   Student remains in the same class but moves to the next session.
 *
 * For SS3:
 *   Student remains in SS3.
 *   Promotion.decision becomes "graduated".
 *   The academic session still advances.
 */
exports.applyPromotion = asyncHandler(async (req, res) => {
  const { resultId } = req.params;

  /*
  |--------------------------------------------------------------------------
  | Find Result
  |--------------------------------------------------------------------------
  */

  const result = await Result.findById(resultId);

  if (!result) {
    return res.status(404).json({
      success: false,
      message: "Result not found.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Third-Term Requirement
  |--------------------------------------------------------------------------
  */

  if (result.term !== "third") {
    return res.status(400).json({
      success: false,
      message: "Only third-term results can be used for promotion.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Result Approval Requirement
  |--------------------------------------------------------------------------
  */

  if (result.status !== "approved") {
    return res.status(400).json({
      success: false,
      message: "Only approved results can be used for promotion.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Principal Decision Requirement
  |--------------------------------------------------------------------------
  */

  if (!["promoted", "repeat"].includes(result.principalDecision)) {
    return res.status(400).json({
      success: false,
      message:
        "A final Principal decision of promoted or repeat is required before promotion can be applied.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Prevent Duplicate Promotion
  |--------------------------------------------------------------------------
  */

  const existingPromotion = await Promotion.findOne({
    sourceResult: result._id,
  });

  if (existingPromotion) {
    return res.status(409).json({
      success: false,
      message: "This result has already been used to apply a promotion.",
      promotion: existingPromotion,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Find Student
  |--------------------------------------------------------------------------
  */

  const student = await Student.findById(result.student);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student associated with this result was not found.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Find Source Academic Session
  |--------------------------------------------------------------------------
  */

  const sourceSession = await AcademicSession.findById(result.academicSession);

  if (!sourceSession) {
    return res.status(404).json({
      success: false,
      message: "Academic session associated with this result was not found.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Derive Next Academic Session
  |--------------------------------------------------------------------------
  */

  const nextSessionName = getNextSessionName(sourceSession.name);

  const nextSession = await AcademicSession.findOne({
    name: nextSessionName,
  });

  if (!nextSession) {
    return res.status(404).json({
      success: false,
      message: `Academic session ${nextSessionName} was not found.`,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Determine Promotion Target
  |--------------------------------------------------------------------------
  */

  const fromClass = result.currentClass;

  if (!fromClass) {
    return res.status(400).json({
      success: false,
      message: "The result does not contain a valid class snapshot.",
    });
  }

  let toClass;
  let decision;

  /*
  |--------------------------------------------------------------------------
  | Repeat
  |--------------------------------------------------------------------------
  |
  | A repeating student remains in the same class but moves
  | into the next academic session.
  |
  */

  if (result.principalDecision === "repeat") {
    toClass = fromClass;
    decision = "repeat";
  } else if (fromClass === "SS3") {

  /*
  |--------------------------------------------------------------------------
  | Graduation
  |--------------------------------------------------------------------------
  |
  | SS3 is the final class.
  |
  | We do NOT set Student.currentClass to "Graduated" because
  | the Student schema only allows the academic classes.
  |
  | Instead:
  |
  |   toClass = "SS3"
  |   decision = "graduated"
  |
  */
    toClass = "SS3";
    decision = "graduated";
  } else {

  /*
  |--------------------------------------------------------------------------
  | Normal Promotion
  |--------------------------------------------------------------------------
  */
    toClass = getNextClass(fromClass);

    if (!toClass) {
      return res.status(400).json({
        success: false,
        message: `No promotion path is configured for class ${fromClass}.`,
      });
    }

    decision = "promoted";
  }

  /*
  |--------------------------------------------------------------------------
  | Preserve Student State
  |--------------------------------------------------------------------------
  |
  | Keep the previous values so we can restore them if creating the
  | Promotion record fails.
  |
  */

  const previousStudentState = {
    currentClass: student.currentClass,
    session: student.session,
    updatedBy: student.updatedBy,
  };

  /*
  |--------------------------------------------------------------------------
  | Update Student
  |--------------------------------------------------------------------------
  */

  student.currentClass = toClass;
  student.session = nextSession.name;
  student.updatedBy = req.admin._id;

  try {
    await student.save();
  } catch (error) {
    throw error;
  }

  /*
  |--------------------------------------------------------------------------
  | Create Promotion Record
  |--------------------------------------------------------------------------
  */

  let promotion;

  try {
    promotion = await Promotion.create({
      student: student._id,

      sourceResult: result._id,

      fromSession: sourceSession._id,

      toSession: nextSession._id,

      fromClass,

      toClass,

      decision,

      appliedBy: req.admin._id,

      appliedAt: new Date(),
    });
  } catch (error) {
    /*
     * Restore the Student if Promotion creation fails.
     *
     * This keeps the Student and Promotion records consistent.
     */

    student.currentClass = previousStudentState.currentClass;
    student.session = previousStudentState.session;
    student.updatedBy = previousStudentState.updatedBy;

    try {
      await student.save();
    } catch (rollbackError) {
      console.error(
        "Promotion student rollback failed:",
        rollbackError.message,
      );
    }

    /*
     * Another request may have successfully created the promotion
     * at the same time.
     */

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This promotion has already been applied.",
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

    action: "APPLY",

    module: "PROMOTION",

    description:
      `${req.admin.fullName} applied ${decision} for student ` +
      `${student.firstName} ${student.lastName} ` +
      `from ${fromClass} (${sourceSession.name}) ` +
      `to ${toClass} (${nextSession.name})`,

    req,
  });

  /*
  |--------------------------------------------------------------------------
  | Activity Log
  |--------------------------------------------------------------------------
  */

  await logActivity({
    adminId: req.admin._id,

    action: "APPLY_PROMOTION",

    studentId: student.studentId,

    details:
      `${student.firstName} ${student.lastName}: ` +
      `${fromClass} (${sourceSession.name}) → ` +
      `${toClass} (${nextSession.name})`,
  });

  /*
  |--------------------------------------------------------------------------
  | Response
  |--------------------------------------------------------------------------
  */

  return res.status(200).json({
    success: true,

    message:
      decision === "graduated"
        ? "Student graduated successfully."
        : decision === "repeat"
          ? "Student repeat decision applied successfully."
          : "Student promoted successfully.",

    promotion,

    student,
  });
});

/*
|--------------------------------------------------------------------------
| Get Promotion History
|--------------------------------------------------------------------------
*/

/**
 * Get promotion history with pagination and filters.
 *
 * Supported query parameters:
 *
 * page
 * limit
 * academicSession
 * decision
 * fromClass
 * toClass
 * search
 */
exports.getPromotions = asyncHandler(async (req, res) => {
  /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const skip = (page - 1) * limit;

  /*
  |--------------------------------------------------------------------------
  | Query Parameters
  |--------------------------------------------------------------------------
  */

  const { academicSession, decision, fromClass, toClass, search } = req.query;

  const query = {};

  /*
  |--------------------------------------------------------------------------
  | Academic Session Filter
  |--------------------------------------------------------------------------
  */

  if (academicSession) {
    if (!mongoose.Types.ObjectId.isValid(academicSession)) {
      return res.status(400).json({
        success: false,
        message: "Invalid academic session ID.",
      });
    }

    query.fromSession = academicSession;
  }

  /*
  |--------------------------------------------------------------------------
  | Decision Filter
  |--------------------------------------------------------------------------
  */

  if (decision) {
    if (!["promoted", "repeat", "graduated"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Invalid promotion decision.",
      });
    }

    query.decision = decision;
  }

  /*
  |--------------------------------------------------------------------------
  | From Class Filter
  |--------------------------------------------------------------------------
  */

  if (fromClass?.trim()) {
    query.fromClass = fromClass.trim();
  }

  /*
  |--------------------------------------------------------------------------
  | To Class Filter
  |--------------------------------------------------------------------------
  */

  if (toClass?.trim()) {
    query.toClass = toClass.trim();
  }

  /*
  |--------------------------------------------------------------------------
  | Student Search
  |--------------------------------------------------------------------------
  */

  if (search?.trim()) {
    const searchTerm = search.trim();

    const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const matchingStudents = await Student.find({
      $or: [
        {
          studentId: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
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
          $expr: {
            $regexMatch: {
              input: {
                $trim: {
                  input: {
                    $concat: [
                      "$firstName",
                      " ",
                      "$lastName",
                      " ",
                      {
                        $ifNull: ["$otherName", ""],
                      },
                    ],
                  },
                },
              },
              regex: escapedSearch,
              options: "i",
            },
          },
        },
      ],
    })
      .select("_id")
      .lean();

    query.student = {
      $in: matchingStudents.map((student) => student._id),
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Fetch Promotions + Count
  |--------------------------------------------------------------------------
  */

  const [promotions, totalPromotions] = await Promise.all([
    Promotion.find(query)
      .populate(
        "student",
        "studentId firstName lastName otherName currentClass session",
      )
      .populate("sourceResult")
      .populate("fromSession", "name")
      .populate("toSession", "name")
      .populate("appliedBy", "fullName email role")
      .sort({
        appliedAt: -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Promotion.countDocuments(query),
  ]);

  /*
  |--------------------------------------------------------------------------
  | Response
  |--------------------------------------------------------------------------
  */

  return res.status(200).json({
    success: true,

    promotions,

    pagination: {
      currentPage: page,
      limit,
      totalPromotions,

      totalPages: Math.ceil(totalPromotions / limit),
    },
  });
});
