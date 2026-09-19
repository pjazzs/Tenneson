const RESULT_LIMITS = {
  CA1_MAX: 20,
  CA2_MAX: 10,
  EXAM_MAX: 70,
  TERM_TOTAL_MAX: 100,
  CUMULATIVE_MAX: 300,
};

/*
|--------------------------------------------------------------------------
| Utility Functions
|--------------------------------------------------------------------------
*/

const roundToTwo = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const isValidNumber = (value) => {
  return typeof value === "number" && Number.isFinite(value);
};

const getSubjectKey = (subject) => {
  if (!subject) {
    return null;
  }

  if (typeof subject === "string") {
    return subject;
  }

  if (subject._id) {
    return subject._id.toString();
  }

  return subject.toString();
};

/*
|--------------------------------------------------------------------------
| Grade Calculation
|--------------------------------------------------------------------------
|
| School grading structure:
|
| 70 - 100  = D
| 60 - 69   = M
| 50 - 59   = P (Pass)
| 40 - 49   = P (Poor)
| 0  - 39   = F
|
| Note:
| P is intentionally used for both 50-59 and 40-49.
| The remark distinguishes PASS from POOR.
|
*/

const calculateGrade = (score) => {
  if (!isValidNumber(score)) {
    throw new Error("A valid score is required to calculate grade");
  }

  if (score < 0 || score > 100) {
    throw new Error("Grade score must be between 0 and 100");
  }

  if (score >= 70) {
    return {
      grade: "D",
      remark: "DISTINCTION",
    };
  }

  if (score >= 60) {
    return {
      grade: "M",
      remark: "MERIT",
    };
  }

  if (score >= 50) {
    return {
      grade: "P",
      remark: "PASS",
    };
  }

  if (score >= 40) {
    return {
      grade: "P",
      remark: "POOR",
    };
  }

  return {
    grade: "F",
    remark: "FAIL",
  };
};

/*
|--------------------------------------------------------------------------
| Performance Comment
|--------------------------------------------------------------------------
|
| Used for First and Second Term.
|
*/

const calculatePerformanceComment = (percentage) => {
  if (!isValidNumber(percentage)) {
    throw new Error(
      "A valid percentage is required to calculate performance comment",
    );
  }

  if (percentage < 0 || percentage > 100) {
    throw new Error("Performance percentage must be between 0 and 100");
  }

  if (percentage >= 70) {
    return "Excellent performance. Keep up the good work.";
  }

  if (percentage >= 60) {
    return "Good result. You can achieve even better with greater effort.";
  }

  if (percentage >= 50) {
    return "Fair performance. Put in more effort to achieve better results.";
  }

  if (percentage >= 40) {
    return "Your performance needs improvement. Sit up and take your studies more seriously.";
  }

  return "Poor performance. You need to put in extra effort and seek additional academic support.";
};

/*
|--------------------------------------------------------------------------
| Promotion Recommendation
|--------------------------------------------------------------------------
|
| Third Term only:
|
| 50% and above = recommended promoted
| Below 50%     = recommended repeat
|
| The Principal's final decision is handled separately.
|
*/

const calculatePromotionRecommendation = (overallPercentage) => {
  if (!isValidNumber(overallPercentage)) {
    throw new Error(
      "A valid percentage is required to calculate promotion recommendation",
    );
  }

  if (overallPercentage < 0 || overallPercentage > 100) {
    throw new Error("Promotion percentage must be between 0 and 100");
  }

  if (overallPercentage >= 50) {
    return "recommended_promoted";
  }

  return "recommended_repeat";
};

/*
|--------------------------------------------------------------------------
| Validate Subject Scores
|--------------------------------------------------------------------------
*/

const validateSubjectScores = (subject) => {
  if (!subject) {
    throw new Error("Subject result is required");
  }

  /*
   * A subject that is not offered in the current term
   * must not have current-term scores.
   */
  if (!subject.offered) {
    return;
  }

  if (!isValidNumber(subject.ca1)) {
    throw new Error(
      `${subject.subjectName || "Subject"} CA1 score is required`,
    );
  }

  if (!isValidNumber(subject.ca2)) {
    throw new Error(
      `${subject.subjectName || "Subject"} CA2 score is required`,
    );
  }

  if (!isValidNumber(subject.exam)) {
    throw new Error(
      `${subject.subjectName || "Subject"} examination score is required`,
    );
  }

  if (subject.ca1 < 0 || subject.ca1 > RESULT_LIMITS.CA1_MAX) {
    throw new Error(
      `${subject.subjectName || "Subject"} CA1 must be between 0 and 20`,
    );
  }

  if (subject.ca2 < 0 || subject.ca2 > RESULT_LIMITS.CA2_MAX) {
    throw new Error(
      `${subject.subjectName || "Subject"} CA2 must be between 0 and 10`,
    );
  }

  if (subject.exam < 0 || subject.exam > RESULT_LIMITS.EXAM_MAX) {
    throw new Error(
      `${subject.subjectName || "Subject"} examination score must be between 0 and 70`,
    );
  }
};

/*
|--------------------------------------------------------------------------
| Calculate Current Term Subject Total
|--------------------------------------------------------------------------
|
| CA1 + CA2 + Examination = Total
|
| 20 + 10 + 70 = 100
|
*/

const calculateSubjectTotal = (subject) => {
  validateSubjectScores(subject);

  /*
   * Subjects not offered in the current term have
   * no current-term score.
   */
  if (!subject.offered) {
    return {
      ...subject,
      ca1: null,
      ca2: null,
      exam: null,
      total: null,
      grade: null,
      remark: "",
    };
  }

  const total = subject.ca1 + subject.ca2 + subject.exam;

  const roundedTotal = roundToTwo(total);

  const { grade, remark } = calculateGrade(roundedTotal);

  return {
    ...subject,
    total: roundedTotal,
    grade,
    remark,
  };
};

/*
|--------------------------------------------------------------------------
| Calculate First / Second Term
|--------------------------------------------------------------------------
|
| Overall percentage:
|
|     Sum of subject totals
|     --------------------- × 100
|     Total obtainable marks
|
| Example:
|
| 10 subjects
| Maximum = 1000
| Student total = 856
|
| 856 / 1000 × 100 = 85.6%
|
*/

const calculateRegularTermResult = (subjectResults) => {
  if (!Array.isArray(subjectResults)) {
    throw new Error("Subject results must be an array");
  }

  const calculatedSubjects = subjectResults.map(calculateSubjectTotal);

  const offeredSubjects = calculatedSubjects.filter(
    (subject) => subject.offered,
  );

  if (offeredSubjects.length === 0) {
    throw new Error("At least one subject must be offered");
  }

  const totalScore = offeredSubjects.reduce(
    (sum, subject) => sum + subject.total,
    0,
  );

  const totalObtainableMarks =
    offeredSubjects.length * RESULT_LIMITS.TERM_TOTAL_MAX;

  const overallPercentage =
    totalObtainableMarks === 0 ? 0 : (totalScore / totalObtainableMarks) * 100;

  const roundedPercentage = roundToTwo(overallPercentage);

  return {
    subjectResults: calculatedSubjects,

    totalScore: roundToTwo(totalScore),

    totalObtainableMarks,

    overallPercentage: roundedPercentage,

    performanceComment: calculatePerformanceComment(roundedPercentage),

    promotionStatus: "not_applicable",

    principalDecision: "pending",
  };
};

/*
|--------------------------------------------------------------------------
| Normalize Previous Term Subject
|--------------------------------------------------------------------------
|
| A previous subject result can look like:
|
| {
|   subject: "...",
|   offered: true,
|   total: 62
| }
|
| Important:
|
| offered = true + total = 0
|
| means the student actually offered the subject and
| scored zero. The 100 marks therefore remain part of
| the denominator.
|
| offered = false
|
| means the subject was not offered and its 100 marks
| must be excluded.
|
*/

const normalizePreviousTermSubject = (subject) => {
  if (!subject) {
    return {
      offered: false,
      total: null,
    };
  }

  return {
    offered: Boolean(subject.offered),

    total:
      subject.offered && isValidNumber(subject.total) ? subject.total : null,
  };
};

/*
|--------------------------------------------------------------------------
| Build Previous Term Lookup
|--------------------------------------------------------------------------
|
| Converts an array into a Map:
|
| subjectId → {
|   offered: true,
|   total: 62
| }
|
*/

const buildPreviousTermLookup = (subjectResults) => {
  const lookup = new Map();

  if (!Array.isArray(subjectResults)) {
    return lookup;
  }

  subjectResults.forEach((subject) => {
    const subjectKey = getSubjectKey(subject.subject);

    if (!subjectKey) {
      return;
    }

    lookup.set(subjectKey, normalizePreviousTermSubject(subject));
  });

  return lookup;
};

/*
|--------------------------------------------------------------------------
| Calculate Third Term Subject
|--------------------------------------------------------------------------
|
| Third term subject calculation:
|
| First Term total       / 100
| Second Term total      / 100
| Third Term total       / 100
| --------------------------------
| Cumulative             / 300
|
| Weighted Average:
|
| cumulative / number of applicable terms
|
| Example:
|
| First  = 70
| Second = 60
| Third  = 80
|
| Cumulative = 210
| Weighted Average = 210 / 3 = 70
|
| If only First + Third were offered:
|
| First = 70
| Third = 80
|
| Cumulative = 150
| Weighted Average = 150 / 2 = 75
|
*/

const calculateThirdTermSubject = (
  subject,
  firstTermLookup,
  secondTermLookup,
) => {
  validateSubjectScores(subject);

  const subjectKey = getSubjectKey(subject.subject);

  const firstTerm = firstTermLookup.get(subjectKey) || {
    offered: false,
    total: null,
  };

  const secondTerm = secondTermLookup.get(subjectKey) || {
    offered: false,
    total: null,
  };

  /*
   |--------------------------------------------------------------------------
   | Subject Not Offered In Third Term
   |--------------------------------------------------------------------------
   */

  if (!subject.offered) {
    return {
      ...subject,

      ca1: null,
      ca2: null,
      exam: null,

      total: null,

      firstTerm: {
        offered: firstTerm.offered,
        total: firstTerm.total,
      },

      secondTerm: {
        offered: secondTerm.offered,
        total: secondTerm.total,
      },

      cumulativeScore: null,

      weightedAverage: null,

      grade: null,

      remark: "",
    };
  }

  /*
   |--------------------------------------------------------------------------
   | Calculate Third Term Score
   |--------------------------------------------------------------------------
   */

  const thirdTermTotal = subject.ca1 + subject.ca2 + subject.exam;

  const roundedThirdTermTotal = roundToTwo(thirdTermTotal);

  /*
   |--------------------------------------------------------------------------
   | Calculate Cumulative Score
   |--------------------------------------------------------------------------
   */

  let cumulativeScore = roundedThirdTermTotal;

  let totalTermsOffered = 1;

  /*
   * First Term contributes only when:
   *
   * 1. The subject was offered.
   * 2. A valid previous total exists.
   */
  if (firstTerm.offered && isValidNumber(firstTerm.total)) {
    cumulativeScore += firstTerm.total;

    totalTermsOffered += 1;
  }

  /*
   * Second Term contributes only when:
   *
   * 1. The subject was offered.
   * 2. A valid previous total exists.
   */
  if (secondTerm.offered && isValidNumber(secondTerm.total)) {
    cumulativeScore += secondTerm.total;

    totalTermsOffered += 1;
  }

  /*
   |--------------------------------------------------------------------------
   | Weighted Average
   |--------------------------------------------------------------------------
   |
   | The denominator is the number of applicable terms.
   |
   | All three terms:
   |
   | 180 / 3 = 60
   |
   | First + Third only:
   |
   | 127 / 2 = 63.5
   |
   */

  const weightedAverage = cumulativeScore / totalTermsOffered;

  const roundedWeightedAverage = roundToTwo(weightedAverage);

  const { grade, remark } = calculateGrade(roundedWeightedAverage);

  return {
    ...subject,

    total: roundedThirdTermTotal,

    firstTerm: {
      offered: firstTerm.offered,
      total: firstTerm.total,
    },

    secondTerm: {
      offered: secondTerm.offered,
      total: secondTerm.total,
    },

    cumulativeScore: roundToTwo(cumulativeScore),

    weightedAverage: roundedWeightedAverage,

    grade,

    remark,
  };
};

/*
|--------------------------------------------------------------------------
| Add Previous Term Scores To Overall
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Previous-term scores are calculated independently from
| the current Third Term subject list.
|
| This is necessary because subject combinations can differ
| between terms.
|
| Example:
|
| First Term:
|   Mathematics
|   English
|   Biology
|
| Second Term:
|   Mathematics
|   English
|
| Third Term:
|   Mathematics
|   English
|
| Biology's First Term score must still contribute to the
| Third Term cumulative overall result.
|
*/

const addPreviousTermScoresToOverall = (subjectResults, totals) => {
  if (!Array.isArray(subjectResults)) {
    return;
  }

  subjectResults.forEach((subject) => {
    const normalized = normalizePreviousTermSubject(subject);

    /*
     * IMPORTANT:
     *
     * total = 0 is valid.
     *
     * Therefore we must not use:
     *
     * if (normalized.total)
     *
     * because zero would be treated as false.
     */
    if (normalized.offered && isValidNumber(normalized.total)) {
      totals.totalScore += normalized.total;

      totals.totalObtainableMarks += RESULT_LIMITS.TERM_TOTAL_MAX;
    }
  });
};

/*
|--------------------------------------------------------------------------
| Calculate Third Term Result
|--------------------------------------------------------------------------
|
| Third Term overall percentage uses ALL applicable
| subject-term combinations.
|
| Example:
|
| 10 subjects × 3 terms × 100
| = 3000 obtainable marks
|
| If one subject was not offered in Second Term:
|
| 3000 - 100
| = 2900 obtainable marks
|
| If two subject-term combinations were not applicable:
|
| 3000 - 200
| = 2800 obtainable marks
|
| If the entire Second Term had no result:
|
| 10 subjects × 2 applicable terms × 100
| = 2000 obtainable marks
|
*/

const calculateThirdTermResult = ({
  subjectResults,
  firstTermResults = [],
  secondTermResults = [],
}) => {
  if (!Array.isArray(subjectResults)) {
    throw new Error("Subject results must be an array");
  }

  /*
   |--------------------------------------------------------------------------
   | Build Previous-Term Lookups
   |--------------------------------------------------------------------------
   */

  const firstTermLookup = buildPreviousTermLookup(firstTermResults);

  const secondTermLookup = buildPreviousTermLookup(secondTermResults);

  /*
   |--------------------------------------------------------------------------
   | Calculate Current Third-Term Subjects
   |--------------------------------------------------------------------------
   */

  const calculatedSubjects = subjectResults.map((subject) =>
    calculateThirdTermSubject(subject, firstTermLookup, secondTermLookup),
  );

  /*
   |--------------------------------------------------------------------------
   | Ensure At Least One Current Subject Is Offered
   |--------------------------------------------------------------------------
   */

  const offeredSubjects = calculatedSubjects.filter(
    (subject) => subject.offered,
  );

  if (offeredSubjects.length === 0) {
    throw new Error("At least one subject must be offered in Third Term");
  }

  /*
   |--------------------------------------------------------------------------
   | Calculate Dynamic Overall Score
   |--------------------------------------------------------------------------
   |
   | We calculate:
   |
   | 1. ALL applicable First Term subject scores
   | 2. ALL applicable Second Term subject scores
   | 3. ALL applicable Third Term subject scores
   |
   | Previous-term subjects do NOT need to appear in the
   | current Third Term subject list.
   |
   */

  const totals = {
    totalScore: 0,
    totalObtainableMarks: 0,
  };

  /*
   |--------------------------------------------------------------------------
   | First Term Contribution
   |--------------------------------------------------------------------------
   */

  addPreviousTermScoresToOverall(firstTermResults, totals);

  /*
   |--------------------------------------------------------------------------
   | Second Term Contribution
   |--------------------------------------------------------------------------
   */

  addPreviousTermScoresToOverall(secondTermResults, totals);

  /*
   |--------------------------------------------------------------------------
   | Third Term Contribution
   |--------------------------------------------------------------------------
   */

  calculatedSubjects.forEach((subject) => {
    if (!subject.offered) {
      return;
    }

    if (isValidNumber(subject.total)) {
      totals.totalScore += subject.total;

      totals.totalObtainableMarks += RESULT_LIMITS.TERM_TOTAL_MAX;
    }
  });

  /*
   |--------------------------------------------------------------------------
   | Validate Obtainable Marks
   |--------------------------------------------------------------------------
   */

  if (totals.totalObtainableMarks === 0) {
    throw new Error("No obtainable marks were found for Third Term result");
  }

  /*
   |--------------------------------------------------------------------------
   | Calculate Overall Percentage
   |--------------------------------------------------------------------------
   */

  const overallPercentage =
    (totals.totalScore / totals.totalObtainableMarks) * 100;

  const roundedPercentage = roundToTwo(overallPercentage);

  /*
   |--------------------------------------------------------------------------
   | Return Calculated Result
   |--------------------------------------------------------------------------
   */

  return {
    subjectResults: calculatedSubjects,

    totalScore: roundToTwo(totals.totalScore),

    totalObtainableMarks: totals.totalObtainableMarks,

    overallPercentage: roundedPercentage,

    /*
     * Third Term does not use the First/Second Term
     * performance comment mapping.
     */
    performanceComment: "",

    /*
     * This is only a SYSTEM RECOMMENDATION.
     * The Principal still makes the final decision.
     */
    promotionStatus: calculatePromotionRecommendation(roundedPercentage),

    principalDecision: "pending",
  };
};

/*
|--------------------------------------------------------------------------
| Attendance Validation
|--------------------------------------------------------------------------
*/

const validateAttendance = (attendance) => {
  if (!attendance) {
    return {
      daysSchoolOpened: 0,
      daysPresent: 0,
      daysAbsent: 0,
    };
  }

  const { daysSchoolOpened = 0, daysPresent = 0, daysAbsent = 0 } = attendance;

  if (!Number.isInteger(daysSchoolOpened) || daysSchoolOpened < 0) {
    throw new Error("Days school opened must be a non-negative whole number");
  }

  if (!Number.isInteger(daysPresent) || daysPresent < 0) {
    throw new Error("Days present must be a non-negative whole number");
  }

  if (!Number.isInteger(daysAbsent) || daysAbsent < 0) {
    throw new Error("Days absent must be a non-negative whole number");
  }

  if (daysPresent > daysSchoolOpened) {
    throw new Error("Days present cannot exceed days school opened");
  }

  if (daysAbsent > daysSchoolOpened) {
    throw new Error("Days absent cannot exceed days school opened");
  }

  if (daysPresent + daysAbsent !== daysSchoolOpened) {
    throw new Error(
      "Days present plus days absent must equal days school opened",
    );
  }

  return {
    daysSchoolOpened,
    daysPresent,
    daysAbsent,
  };
};

/*
|--------------------------------------------------------------------------
| Main Result Calculation Function
|--------------------------------------------------------------------------
|
| This is the function controllers normally call.
|
| First Term:
|
| calculateResult({
|   term: "first",
|   subjectResults
| })
|
| Second Term:
|
| calculateResult({
|   term: "second",
|   subjectResults
| })
|
| Third Term:
|
| calculateResult({
|   term: "third",
|   subjectResults,
|   firstTermResults,
|   secondTermResults
| })
|
|--------------------------------------------------------------------------
*/

const calculateResult = ({
  term,
  subjectResults,
  firstTermResults = [],
  secondTermResults = [],
}) => {
  if (!["first", "second", "third"].includes(term)) {
    throw new Error("Term must be first, second, or third");
  }

  if (term === "third") {
    return calculateThirdTermResult({
      subjectResults,
      firstTermResults,
      secondTermResults,
    });
  }

  return calculateRegularTermResult(subjectResults);
};

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  RESULT_LIMITS,

  calculateResult,

  calculateRegularTermResult,

  calculateThirdTermResult,

  calculateSubjectTotal,

  calculateGrade,

  calculatePerformanceComment,

  calculatePromotionRecommendation,

  validateAttendance,

  roundToTwo,
};
