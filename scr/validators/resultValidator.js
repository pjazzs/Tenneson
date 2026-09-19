const Joi = require("joi");

/*
|--------------------------------------------------------------------------
| ObjectId Validation
|--------------------------------------------------------------------------
*/

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "{{#label}} must be a valid MongoDB ObjectId",
  });

/*
|--------------------------------------------------------------------------
| Reusable Subject Result Schema
|--------------------------------------------------------------------------
|
| The client only submits information that a teacher is allowed to enter.
|
| Server-controlled fields are deliberately excluded:
|
| - subjectName
| - subjectCode
| - total
| - firstTerm
| - secondTerm
| - cumulativeScore
| - weightedAverage
| - grade
| - remark
|
*/

const subjectResultSchema = Joi.object({
  subjectId: objectId.required(),

  /*
   * true:
   *   Subject is offered and contributes to obtainable marks.
   *
   * false:
   *   Subject is not offered and contributes nothing to the denominator.
   */
  offered: Joi.boolean().required(),

  /*
   * Current term scores.
   *
   * These are nullable because the draft may temporarily
   * contain an unentered score.
   */
  ca1: Joi.number().min(0).max(20).allow(null).optional(),

  ca2: Joi.number().min(0).max(10).allow(null).optional(),

  exam: Joi.number().min(0).max(70).allow(null).optional(),

  /*
   * Teacher's subject comment.
   */
  teacherComment: Joi.string().trim().max(1000).allow("").optional(),
})
  .custom((subject, helpers) => {
    /*
     * If the subject is not offered, scores must be null
     * or omitted.
     */
    if (!subject.offered) {
      const hasScore = subject.ca1 !== null && subject.ca1 !== undefined;

      const hasCa2 = subject.ca2 !== null && subject.ca2 !== undefined;

      const hasExam = subject.exam !== null && subject.exam !== undefined;

      if (hasScore || hasCa2 || hasExam) {
        return helpers.error("subjectResult.unofferedScores");
      }
    }

    return subject;
  })
  .messages({
    "subjectResult.unofferedScores":
      "A subject that is not offered cannot have CA1, CA2, or examination scores.",
  });

/*
|--------------------------------------------------------------------------
| Attendance Schema
|--------------------------------------------------------------------------
|
| Matches:
|
| models/Result.js
| services/resultCalculationService.js
|
| daysSchoolOpened
| daysPresent
| daysAbsent
|
*/

const attendanceSchema = Joi.object({
  daysSchoolOpened: Joi.number().integer().min(0).required(),

  daysPresent: Joi.number().integer().min(0).required(),

  daysAbsent: Joi.number().integer().min(0).required(),
})
  .custom((attendance, helpers) => {
    if (attendance.daysPresent > attendance.daysSchoolOpened) {
      return helpers.error("attendance.presentGreaterThanOpened");
    }

    if (attendance.daysAbsent > attendance.daysSchoolOpened) {
      return helpers.error("attendance.absentGreaterThanOpened");
    }

    if (
      attendance.daysPresent + attendance.daysAbsent !==
      attendance.daysSchoolOpened
    ) {
      return helpers.error("attendance.invalidTotal");
    }

    return attendance;
  })
  .messages({
    "attendance.presentGreaterThanOpened":
      "Days present cannot exceed days school opened.",

    "attendance.absentGreaterThanOpened":
      "Days absent cannot exceed days school opened.",

    "attendance.invalidTotal":
      "Days present plus days absent must equal days school opened.",
  });

/*
|--------------------------------------------------------------------------
| Affective Domain Schema
|--------------------------------------------------------------------------
|
| Each item is scored from 0 to 5.
|
*/

const affectiveDomainSchema = Joi.object({
  punctuality: Joi.number().integer().min(0).max(5).required(),

  attentiveness: Joi.number().integer().min(0).max(5).required(),

  neatness: Joi.number().integer().min(0).max(5).required(),

  politeness: Joi.number().integer().min(0).max(5).required(),

  reliability: Joi.number().integer().min(0).max(5).required(),

  honesty: Joi.number().integer().min(0).max(5).required(),

  initiative: Joi.number().integer().min(0).max(5).required(),

  attitudeToWork: Joi.number().integer().min(0).max(5).required(),
});

/*
|--------------------------------------------------------------------------
| Psychomotor Domain Schema
|--------------------------------------------------------------------------
|
| Each item is scored from 0 to 5.
|
*/

const psychomotorDomainSchema = Joi.object({
  sportingActivities: Joi.number().integer().min(0).max(5).required(),

  handWriting: Joi.number().integer().min(0).max(5).required(),

  fluency: Joi.number().integer().min(0).max(5).required(),

  drawingAndPainting: Joi.number().integer().min(0).max(5).required(),

  musicalAbility: Joi.number().integer().min(0).max(5).required(),
});

/*
|--------------------------------------------------------------------------
| Conduct Schema
|--------------------------------------------------------------------------
|
| Result.js expects:
|
| "good"
| "bad"
|
*/

const conductSchema = Joi.string().valid("good", "bad").default("good");

/*
|--------------------------------------------------------------------------
| Sports Schema
|--------------------------------------------------------------------------
*/

const sportSchema = Joi.object({
  event: Joi.string().trim().max(200).required(),

  remark: Joi.string().trim().max(500).allow("").optional(),
});

/*
|--------------------------------------------------------------------------
| Clubs Schema
|--------------------------------------------------------------------------
*/

const clubSchema = Joi.object({
  organization: Joi.string().trim().max(200).required(),

  officeHeld: Joi.string().trim().max(200).allow("").optional(),

  significantContribution: Joi.string().trim().max(1000).allow("").optional(),
});

/*
|--------------------------------------------------------------------------
| Class Teacher Comments
|--------------------------------------------------------------------------
|
| The class teacher is only allowed to provide the class-teacher
| comment during result posting.
|
| Principal comment is handled by a separate endpoint.
|
| Performance comment is generated by the backend.
|
*/

const classTeacherCommentsSchema = Joi.object({
  classTeacher: Joi.string().trim().max(2000).allow("").optional(),
});

/*
|--------------------------------------------------------------------------
| Main Result Identification Schema
|--------------------------------------------------------------------------
*/

const resultIdentitySchema = Joi.object({
  studentId: Joi.string().trim().required(),

  academicSessionId: objectId.required(),

  term: Joi.string().valid("first", "second", "third").required(),
});

/*
|--------------------------------------------------------------------------
| COMPLETE RESULT SCHEMA
|--------------------------------------------------------------------------
|
| Used when submitting a complete result payload.
|
| IMPORTANT:
|
| The following are NOT accepted from the client:
|
| - currentClass
| - termDates
| - calculated totals
| - grades
| - previous-term scores
| - cumulative scores
| - promotion recommendation
| - principal decision
| - status
| - principal comment
| - performance comment
|
|--------------------------------------------------------------------------
*/

exports.resultSchema = resultIdentitySchema.keys({
  /*
   * Subjects
   */
  subjectResults: Joi.array().items(subjectResultSchema).min(1).required(),

  /*
   * Attendance
   */
  attendance: attendanceSchema.required(),

  /*
   * Affective domain
   */
  affectiveDomain: affectiveDomainSchema.required(),

  /*
   * Psychomotor domain
   */
  psychomotorDomain: psychomotorDomainSchema.required(),

  /*
   * Conduct
   */
  conduct: conductSchema,

  /*
   * Additional report
   */
  specialReport: Joi.string().trim().max(2000).allow("").optional(),

  /*
   * Sports
   */
  sports: Joi.array().items(sportSchema).default([]),

  /*
   * Clubs / societies
   */
  clubs: Joi.array().items(clubSchema).default([]),

  /*
   * Class teacher comment only.
   */
  comments: classTeacherCommentsSchema.optional(),
});

/*
|--------------------------------------------------------------------------
| DRAFT RESULT SCHEMA
|--------------------------------------------------------------------------
|
| Drafts allow attendance, affective and psychomotor data to be
| temporarily incomplete.
|
| The result must be fully populated before submission.
|
|--------------------------------------------------------------------------
*/

exports.resultDraftSchema = resultIdentitySchema.keys({
  subjectResults: Joi.array().items(subjectResultSchema).min(1).required(),

  attendance: attendanceSchema.optional(),

  affectiveDomain: affectiveDomainSchema.optional(),

  psychomotorDomain: psychomotorDomainSchema.optional(),

  conduct: conductSchema,

  specialReport: Joi.string().trim().max(2000).allow("").optional(),

  sports: Joi.array().items(sportSchema).default([]),

  clubs: Joi.array().items(clubSchema).default([]),

  comments: classTeacherCommentsSchema.optional(),
});

/*
|--------------------------------------------------------------------------
| SUBMIT RESULT SCHEMA
|--------------------------------------------------------------------------
|
| Submitting a result is a workflow action.
|
| No result data should be modified by the submit request.
|
*/

exports.submitResultSchema = Joi.object({}).unknown(false);

/*
|--------------------------------------------------------------------------
| PRINCIPAL COMMENT SCHEMA
|--------------------------------------------------------------------------
|
| Used when the Principal adds or updates their comment.
|
*/

exports.principalCommentSchema = Joi.object({
  principal: Joi.string().trim().max(2000).required(),
});

/*
|--------------------------------------------------------------------------
| APPROVE RESULT SCHEMA
|--------------------------------------------------------------------------
|
| The Principal approves the result.
|
| Third Term:
|   principalDecision MUST be:
|   - promoted
|   - repeat
|
| First / Second Term:
|   principalDecision is not required.
|
| The controller is responsible for enforcing the
| term-specific requirement.
|
|--------------------------------------------------------------------------
*/

exports.approveResultSchema = Joi.object({
  principalComment: Joi.string().trim().max(2000).required(),

  principalDecision: Joi.string().valid("promoted", "repeat").optional(),
});

/*
|--------------------------------------------------------------------------
| PUBLISH RESULT SCHEMA
|--------------------------------------------------------------------------
|
| Publishing requires explicit confirmation.
|
*/

exports.publishResultSchema = Joi.object({
  confirm: Joi.boolean().valid(true).required().messages({
    "any.only": "Publishing must be explicitly confirmed.",
  }),
});

/*
|--------------------------------------------------------------------------
| Export Reusable Schemas
|--------------------------------------------------------------------------
|
| These are useful if other validators/controllers need to reuse
| individual sections.
|
|--------------------------------------------------------------------------
*/

exports.subjectResultSchema = subjectResultSchema;

exports.attendanceSchema = attendanceSchema;

exports.affectiveDomainSchema = affectiveDomainSchema;

exports.psychomotorDomainSchema = psychomotorDomainSchema;

exports.conductSchema = conductSchema;

exports.sportSchema = sportSchema;

exports.clubSchema = clubSchema;

exports.classTeacherCommentsSchema = classTeacherCommentsSchema;
