const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Subject Result Schema
|--------------------------------------------------------------------------
|
| One entry represents one subject within a student's result.
|
| For First/Second Term:
|   ca1 + ca2 + exam = total
|
| For Third Term:
|   ca1 + ca2 + exam = thirdTermTotal
|   firstTerm.total + secondTerm.total + thirdTermTotal
|       = cumulativeScore
|
*/

const previousTermSchema = new mongoose.Schema(
  {
    offered: {
      type: Boolean,
      default: false,
    },

    total: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const subjectResultSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required"],
    },

    // Snapshot of the subject name at the time the result is created.
    subjectName: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },

    // Snapshot of the subject code.
    subjectCode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Subject Offering
    |--------------------------------------------------------------------------
    |
    | true  = student offered the subject.
    | false = student did not offer the subject.
    |
    | This distinction is important:
    |
    | offered: true, score: 0
    |     means the student offered the subject and scored zero.
    |
    | offered: false, score: null
    |     means the subject should not contribute to the denominator.
    |
    */

    offered: {
      type: Boolean,
      default: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Current Term Scores
    |--------------------------------------------------------------------------
    |
    | CA1 = maximum 20
    | CA2 = maximum 10
    | Exam = maximum 70
    | Total = maximum 100
    |
    */

    ca1: {
      type: Number,
      min: 0,
      max: 20,
      default: null,
    },

    ca2: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },

    exam: {
      type: Number,
      min: 0,
      max: 70,
      default: null,
    },

    total: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Third Term Previous Results
    |--------------------------------------------------------------------------
    |
    | These values are retrieved from First and Second Term results.
    | They should NOT be manually entered by the class teacher during
    | Third Term result posting.
    |
    */

    firstTerm: {
      type: previousTermSchema,
      default: null,
    },

    secondTerm: {
      type: previousTermSchema,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Third Term Calculations
    |--------------------------------------------------------------------------
    */

    cumulativeScore: {
      type: Number,
      min: 0,
      max: 300,
      default: null,
    },

    weightedAverage: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Grade / Remark
    |--------------------------------------------------------------------------
    */

    grade: {
      type: String,
      enum: ["D", "M", "P", "F"],
      default: null,
    },

    remark: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Subject Teacher Comment
    |--------------------------------------------------------------------------
    */

    teacherComment: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: true,
  },
);

/*
|--------------------------------------------------------------------------
| Attendance Schema
|--------------------------------------------------------------------------
*/

const attendanceSchema = new mongoose.Schema(
  {
    daysSchoolOpened: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    daysPresent: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    daysAbsent: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| Affective Domain Schema
|--------------------------------------------------------------------------
|
| Each assessment is scored out of 5.
|
*/

const affectiveDomainSchema = new mongoose.Schema(
  {
    punctuality: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    attentiveness: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    neatness: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    politeness: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    reliability: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    honesty: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    initiative: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    attitudeToWork: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },
  },
  {
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| Psychomotor Domain Schema
|--------------------------------------------------------------------------
|
| Each assessment is scored out of 5.
|
*/

const psychomotorDomainSchema = new mongoose.Schema(
  {
    sportingActivities: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    handWriting: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    fluency: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    drawingAndPainting: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },

    musicalAbility: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },
  },
  {
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| Sports Schema
|--------------------------------------------------------------------------
*/

const sportSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      trim: true,
    },

    remark: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: true,
  },
);

/*
|--------------------------------------------------------------------------
| Clubs Schema
|--------------------------------------------------------------------------
*/

const clubSchema = new mongoose.Schema(
  {
    organization: {
      type: String,
      required: true,
      trim: true,
    },

    officeHeld: {
      type: String,
      default: "",
      trim: true,
    },

    significantContribution: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: true,
  },
);

/*
|--------------------------------------------------------------------------
| Comments Schema
|--------------------------------------------------------------------------
*/

const commentsSchema = new mongoose.Schema(
  {
    classTeacher: {
      type: String,
      default: "",
      trim: true,
    },

    principal: {
      type: String,
      default: "",
      trim: true,
    },

    performance: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| Term Dates Snapshot
|--------------------------------------------------------------------------
|
| We store these on the result itself so that changing the academic
| session configuration later does not alter an already-issued report.
|
*/

const termDatesSchema = new mongoose.Schema(
  {
    closingDate: {
      type: Date,
      default: null,
    },

    resumptionDate: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| Result Schema
|--------------------------------------------------------------------------
*/

const resultSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Student
    |--------------------------------------------------------------------------
    */

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Academic Session
    |--------------------------------------------------------------------------
    */

    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: [true, "Academic session is required"],
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Term
    |--------------------------------------------------------------------------
    */

    term: {
      type: String,
      required: [true, "Term is required"],
      enum: ["first", "second", "third"],
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Student Information Snapshot
    |--------------------------------------------------------------------------
    |
    | currentClass is particularly important.
    |
    | If a student is currently in JSS3 but this result was obtained in JSS2,
    | the old result must continue to show JSS2.
    |
    */

    currentClass: {
      type: String,
      required: [true, "Student class is required"],
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Subjects
    |--------------------------------------------------------------------------
    */

    subjectResults: {
      type: [subjectResultSchema],
      default: [],
      validate: {
        validator: function (subjects) {
          const subjectIds = subjects.map((item) => item.subject.toString());

          return new Set(subjectIds).size === subjectIds.length;
        },

        message: "A subject cannot appear more than once in a result",
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Attendance
    |--------------------------------------------------------------------------
    */

    attendance: {
      type: attendanceSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | Affective Domain
    |--------------------------------------------------------------------------
    */

    affectiveDomain: {
      type: affectiveDomainSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | Psychomotor Domain
    |--------------------------------------------------------------------------
    */

    psychomotorDomain: {
      type: psychomotorDomainSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | Conduct
    |--------------------------------------------------------------------------
    */

    conduct: {
      type: String,
      enum: ["good", "bad"],
      default: "good",
    },

    /*
    |--------------------------------------------------------------------------
    | Special Report
    |--------------------------------------------------------------------------
    */

    specialReport: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Sports
    |--------------------------------------------------------------------------
    */

    sports: {
      type: [sportSchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | Clubs
    |--------------------------------------------------------------------------
    */

    clubs: {
      type: [clubSchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | Comments
    |--------------------------------------------------------------------------
    */

    comments: {
      type: commentsSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | Term Dates
    |--------------------------------------------------------------------------
    */

    termDates: {
      type: termDatesSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | Overall Calculation
    |--------------------------------------------------------------------------
    |
    | For First/Second Term:
    |
    |     sum of subject totals
    |     --------------------- × 100
    |     total obtainable marks
    |
    | For Third Term:
    |
    |     sum of cumulative scores
    |     ----------------------- × 100
    |     total obtainable marks
    |
    | The calculation service will populate these values.
    |
    */

    totalScore: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalObtainableMarks: {
      type: Number,
      min: 0,
      default: 0,
    },

    overallPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | Overall Performance Comment
    |--------------------------------------------------------------------------
    |
    | Automatically generated for First and Second Term based on the
    | school's percentage ranges.
    |
    */

    performanceComment: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Third Term Promotion Recommendation
    |--------------------------------------------------------------------------
    |
    | Only applicable to Third Term.
    |
    | 50% and above = promoted
    | Below 50% = repeat
    |
    | The system recommends; the Principal remains the final authority.
    |
    */

    promotionStatus: {
      type: String,
      enum: ["not_applicable", "recommended_promoted", "recommended_repeat"],
      default: "not_applicable",
    },

    /*
    |--------------------------------------------------------------------------
    | Principal's Final Decision
    |--------------------------------------------------------------------------
    |
    | This allows the automatic recommendation to remain separate from
    | the Principal's final decision.
    |
    */

    principalDecision: {
      type: String,
      enum: ["pending", "promoted", "repeat"],
      default: "pending",
    },

    /*
    |--------------------------------------------------------------------------
    | Result Workflow
    |--------------------------------------------------------------------------
    |
    | draft
    |   ↓
    | submitted
    |   ↓
    | approved
    |   ↓
    | published
    |
    */

    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "published"],
      default: "draft",
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Audit Information
    |--------------------------------------------------------------------------
    */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

/*
|--------------------------------------------------------------------------
| One Result Per Student / Session / Term
|--------------------------------------------------------------------------
|
| This prevents accidental duplicate results such as:
|
| Student A + 2026/2027 + First Term
| Student A + 2026/2027 + First Term   ❌
|
*/

resultSchema.index(
  {
    student: 1,
    academicSession: 1,
    term: 1,
  },
  {
    unique: true,
  },
);

/*
|--------------------------------------------------------------------------
| Result Model
|--------------------------------------------------------------------------
*/

const Result = mongoose.models.Result || mongoose.model("Result", resultSchema);

module.exports = Result;
