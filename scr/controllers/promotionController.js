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
 * Create an error with an HTTP status code.
 */
const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Derive the next academic session.
 *
 * Example:
 * 2025/2026 -> 2026/2027
 */
const getNextSessionName = (sessionName) => {
  const match = String(sessionName).match(/^(\d{4})\/(\d{4})$/);

  if (!match) {
    throw createHttpError(
      "The academic session name must use the format YYYY/YYYY.",
      400,
    );
  }

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);

  if (endYear !== startYear + 1) {
    throw createHttpError("Invalid academic session name.", 400);
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
 * Promoted:
 *   Student moves to the next class and next session.
 *
 * Repeat:
 *   Student remains in the same class but moves to the next session.
 *
 * SS3:
 *   Student remains in SS3.
 *   Promotion.decision becomes "graduated".
 *   The academic session advances.
 *
 * IMPORTANT:
 * Student update and Promotion creation happen inside one
 * MongoDB transaction.
 */
exports.applyPromotion = asyncHandler(async (req, res) => {
  const { resultId } = req.params;

  let student;
  let sourceSession;
  let nextSession;
  let promotion;
  let fromClass;
  let toClass;
  let decision;

  /*
  |--------------------------------------------------------------------------
  | Start MongoDB Transaction
  |--------------------------------------------------------------------------
  */

  const mongoSession = await mongoose.startSession();

  try {
    await mongoSession.withTransaction(async () => {
      /*
      |--------------------------------------------------------------------------
      | Find Result Inside Transaction
      |--------------------------------------------------------------------------
      |
      | Re-fetching the result inside the transaction ensures that
      | the decision and result status are checked immediately before
      | applying the promotion.
      |
      */

      const result = await Result.findById(resultId).session(mongoSession);

      if (!result) {
        throw createHttpError("Result not found.", 404);
      }

      /*
      |--------------------------------------------------------------------------
      | Third-Term Requirement
      |--------------------------------------------------------------------------
      */

      if (result.term !== "third") {
        throw createHttpError(
          "Only third-term results can be used for promotion.",
          400,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Result Approval Requirement
      |--------------------------------------------------------------------------
      */

      if (result.status !== "published") {
        throw createHttpError(
          "Only approved and published third-term results can be used for promotion.",
          400,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Principal Decision Requirement
      |--------------------------------------------------------------------------
      */

      if (!["promoted", "repeat"].includes(result.principalDecision)) {
        throw createHttpError(
          "A final Principal decision of promoted or repeat is required before promotion can be applied.",
          400,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Prevent Duplicate Promotion
      |--------------------------------------------------------------------------
      */

      const existingPromotion = await Promotion.findOne({
        sourceResult: result._id,
      }).session(mongoSession);

      if (existingPromotion) {
        throw createHttpError(
          "This result has already been used to apply a promotion.",
          409,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Result Class Snapshot
      |--------------------------------------------------------------------------
      */

      fromClass = result.currentClass;

      if (!fromClass) {
        throw createHttpError(
          "The result does not contain a valid class snapshot.",
          400,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Find Student
      |--------------------------------------------------------------------------
      */

      student = await Student.findById(result.student).session(mongoSession);

      if (!student) {
        throw createHttpError(
          "Student associated with this result was not found.",
          404,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Find Source Academic Session
      |--------------------------------------------------------------------------
      */

      sourceSession = await AcademicSession.findById(
        result.academicSession,
      ).session(mongoSession);

      if (!sourceSession) {
        throw createHttpError(
          "Academic session associated with this result was not found.",
          404,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Integrity Check: Student's Current Class
      |--------------------------------------------------------------------------
      |
      | The student's current class must match the class snapshot
      | stored in the result.
      |
      | This prevents an old result from moving a student who has
      | already been promoted or manually reassigned.
      |
      */

      if (student.currentClass !== fromClass) {
        throw createHttpError(
          "The student's current class does not match the class recorded in this result. Promotion cannot be applied using this outdated result.",
          409,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Integrity Check: Student's Current Academic Session
      |--------------------------------------------------------------------------
      |
      | The student's current session must match the session
      | associated with the result.
      |
      */

      if (student.session !== sourceSession.name) {
        throw createHttpError(
          "The student's current academic session does not match the academic session recorded in this result. Promotion cannot be applied using this outdated result.",
          409,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Derive Next Academic Session
      |--------------------------------------------------------------------------
      */

      const nextSessionName = getNextSessionName(sourceSession.name);

      nextSession = await AcademicSession.findOne({
        name: nextSessionName,
      }).session(mongoSession);

      if (!nextSession) {
        throw createHttpError(
          `Academic session ${nextSessionName} was not found.`,
          404,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Determine Promotion Target
      |--------------------------------------------------------------------------
      */

      /*
      |--------------------------------------------------------------------------
      | Repeat
      |--------------------------------------------------------------------------
      |
      | The student remains in the same class but moves into
      | the next academic session.
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
        | We do not set Student.currentClass to "Graduated"
        | because the Student schema only allows academic classes.
        |
        | Instead:
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
          throw createHttpError(
            `No promotion path is configured for class ${fromClass}.`,
            400,
          );
        }

        decision = "promoted";
      }

      /*
      |--------------------------------------------------------------------------
      | Update Student
      |--------------------------------------------------------------------------
      |
      | This update is part of the transaction.
      | It will be rolled back if Promotion creation fails.
      |
      */

      student.currentClass = toClass;
      student.session = nextSession.name;
      student.updatedBy = req.admin._id;

      await student.save({
        session: mongoSession,
      });

      /*
      |--------------------------------------------------------------------------
      | Create Promotion Record
      |--------------------------------------------------------------------------
      |
      | Promotion.create() receives an array when using a Mongoose
      | session so that the document is created within the transaction.
      |
      */

      const createdPromotions = await Promotion.create(
        [
          {
            student: student._id,

            sourceResult: result._id,

            fromSession: sourceSession._id,

            toSession: nextSession._id,

            fromClass,

            toClass,

            decision,

            appliedBy: req.admin._id,

            appliedAt: new Date(),
          },
        ],
        {
          session: mongoSession,
        },
      );

      promotion = createdPromotions[0];
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Handle Transaction Errors
    |--------------------------------------------------------------------------
    */

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This promotion has already been applied.",
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  } finally {
    await mongoSession.endSession();
  }

  /*
  |--------------------------------------------------------------------------
  | Audit Log
  |--------------------------------------------------------------------------
  |
  | Logs are created after the transaction commits.
  | A failure in logging will not undo a completed promotion.
  |
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
      $in: matchingStudents.map((matchingStudent) => matchingStudent._id),
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
