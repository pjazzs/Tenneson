const {
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
} = require("../services/resultCalculationService");

describe("Result Calculation Service", () => {
  /*
  |--------------------------------------------------------------------------
  | Test Helpers
  |--------------------------------------------------------------------------
  */

  const createSubject = ({
    subject = "subject-id-1",
    subjectName = "Mathematics",
    offered = true,
    ca1 = 15,
    ca2 = 8,
    exam = 60,
  } = {}) => ({
    subject,
    subjectName,
    offered,
    ca1,
    ca2,
    exam,
  });

  /*
  |--------------------------------------------------------------------------
  | RESULT LIMITS
  |--------------------------------------------------------------------------
  */

  describe("RESULT_LIMITS", () => {
    test("Should contain the correct school scoring limits", () => {
      expect(RESULT_LIMITS).toEqual({
        CA1_MAX: 20,
        CA2_MAX: 10,
        EXAM_MAX: 70,
        TERM_TOTAL_MAX: 100,
        CUMULATIVE_MAX: 300,
      });
    });
  });

  /*
  |--------------------------------------------------------------------------
  | roundToTwo
  |--------------------------------------------------------------------------
  */

  describe("roundToTwo", () => {
    test("Should round a number to two decimal places", () => {
      expect(roundToTwo(85.678)).toBe(85.68);
    });

    test("Should preserve a number already at two decimal places", () => {
      expect(roundToTwo(85.67)).toBe(85.67);
    });

    test("Should correctly round down", () => {
      expect(roundToTwo(85.674)).toBe(85.67);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | Grade Calculation
  |--------------------------------------------------------------------------
  */

  describe("calculateGrade", () => {
    test("70 should receive D / DISTINCTION", () => {
      expect(calculateGrade(70)).toEqual({
        grade: "D",
        remark: "DISTINCTION",
      });
    });

    test("100 should receive D / DISTINCTION", () => {
      expect(calculateGrade(100)).toEqual({
        grade: "D",
        remark: "DISTINCTION",
      });
    });

    test("69 should receive M / MERIT", () => {
      expect(calculateGrade(69)).toEqual({
        grade: "M",
        remark: "MERIT",
      });
    });

    test("60 should receive M / MERIT", () => {
      expect(calculateGrade(60)).toEqual({
        grade: "M",
        remark: "MERIT",
      });
    });

    test("59 should receive P / PASS", () => {
      expect(calculateGrade(59)).toEqual({
        grade: "P",
        remark: "PASS",
      });
    });

    test("50 should receive P / PASS", () => {
      expect(calculateGrade(50)).toEqual({
        grade: "P",
        remark: "PASS",
      });
    });

    test("49 should receive P / POOR", () => {
      expect(calculateGrade(49)).toEqual({
        grade: "P",
        remark: "POOR",
      });
    });

    test("40 should receive P / POOR", () => {
      expect(calculateGrade(40)).toEqual({
        grade: "P",
        remark: "POOR",
      });
    });

    test("39 should receive F / FAIL", () => {
      expect(calculateGrade(39)).toEqual({
        grade: "F",
        remark: "FAIL",
      });
    });

    test("0 should receive F / FAIL", () => {
      expect(calculateGrade(0)).toEqual({
        grade: "F",
        remark: "FAIL",
      });
    });

    test("Should reject a score below 0", () => {
      expect(() => calculateGrade(-1)).toThrow(
        "Grade score must be between 0 and 100",
      );
    });

    test("Should reject a score above 100", () => {
      expect(() => calculateGrade(101)).toThrow(
        "Grade score must be between 0 and 100",
      );
    });

    test("Should reject an invalid score", () => {
      expect(() => calculateGrade("70")).toThrow(
        "A valid score is required to calculate grade",
      );
    });
  });

  /*
  |--------------------------------------------------------------------------
  | Performance Comments
  |--------------------------------------------------------------------------
  */

  describe("calculatePerformanceComment", () => {
    test("70 should receive the excellent performance comment", () => {
      expect(calculatePerformanceComment(70)).toBe(
        "Excellent performance. Keep up the good work.",
      );
    });

    test("60 should receive the good result comment", () => {
      expect(calculatePerformanceComment(60)).toBe(
        "Good result. You can achieve even better with greater effort.",
      );
    });

    test("50 should receive the fair performance comment", () => {
      expect(calculatePerformanceComment(50)).toBe(
        "Fair performance. Put in more effort to achieve better results.",
      );
    });

    test("40 should receive the improvement comment", () => {
      expect(calculatePerformanceComment(40)).toBe(
        "Your performance needs improvement. Sit up and take your studies more seriously.",
      );
    });

    test("39 should receive the poor performance comment", () => {
      expect(calculatePerformanceComment(39)).toBe(
        "Poor performance. You need to put in extra effort and seek additional academic support.",
      );
    });

    test("Should reject a percentage below 0", () => {
      expect(() => calculatePerformanceComment(-1)).toThrow(
        "Performance percentage must be between 0 and 100",
      );
    });

    test("Should reject a percentage above 100", () => {
      expect(() => calculatePerformanceComment(101)).toThrow(
        "Performance percentage must be between 0 and 100",
      );
    });
  });

  /*
  |--------------------------------------------------------------------------
  | Promotion Recommendation
  |--------------------------------------------------------------------------
  */

  describe("calculatePromotionRecommendation", () => {
    test("50 should be recommended for promotion", () => {
      expect(calculatePromotionRecommendation(50)).toBe("recommended_promoted");
    });

    test("75 should be recommended for promotion", () => {
      expect(calculatePromotionRecommendation(75)).toBe("recommended_promoted");
    });

    test("49.99 should be recommended for repeat", () => {
      expect(calculatePromotionRecommendation(49.99)).toBe(
        "recommended_repeat",
      );
    });

    test("0 should be recommended for repeat", () => {
      expect(calculatePromotionRecommendation(0)).toBe("recommended_repeat");
    });

    test("Should reject a percentage below 0", () => {
      expect(() => calculatePromotionRecommendation(-1)).toThrow(
        "Promotion percentage must be between 0 and 100",
      );
    });

    test("Should reject a percentage above 100", () => {
      expect(() => calculatePromotionRecommendation(101)).toThrow(
        "Promotion percentage must be between 0 and 100",
      );
    });
  });

  /*
  |--------------------------------------------------------------------------
  | Subject Score Validation
  |--------------------------------------------------------------------------
  */

  describe("calculateSubjectTotal", () => {
    test("Should calculate subject total correctly", () => {
      const subject = createSubject({
        ca1: 15,
        ca2: 8,
        exam: 60,
      });

      const result = calculateSubjectTotal(subject);

      expect(result.total).toBe(83);

      expect(result.grade).toBe("D");

      expect(result.remark).toBe("DISTINCTION");
    });

    test("Should correctly calculate a score of zero", () => {
      const subject = createSubject({
        ca1: 0,
        ca2: 0,
        exam: 0,
      });

      const result = calculateSubjectTotal(subject);

      expect(result.total).toBe(0);

      expect(result.grade).toBe("F");

      expect(result.remark).toBe("FAIL");
    });

    test("Should reject missing CA1", () => {
      const subject = createSubject({
        ca1: null,
      });

      expect(() => calculateSubjectTotal(subject)).toThrow(
        "Mathematics CA1 score is required",
      );
    });

    test("Should reject missing CA2", () => {
      const subject = createSubject({
        ca2: null,
      });

      expect(() => calculateSubjectTotal(subject)).toThrow(
        "Mathematics CA2 score is required",
      );
    });

    test("Should reject missing examination score", () => {
      const subject = createSubject({
        exam: null,
      });

      expect(() => calculateSubjectTotal(subject)).toThrow(
        "Mathematics examination score is required",
      );
    });

    test("Should reject CA1 above 20", () => {
      const subject = createSubject({
        ca1: 21,
      });

      expect(() => calculateSubjectTotal(subject)).toThrow(
        "Mathematics CA1 must be between 0 and 20",
      );
    });

    test("Should reject CA2 above 10", () => {
      const subject = createSubject({
        ca2: 11,
      });

      expect(() => calculateSubjectTotal(subject)).toThrow(
        "Mathematics CA2 must be between 0 and 10",
      );
    });

    test("Should reject examination score above 70", () => {
      const subject = createSubject({
        exam: 71,
      });

      expect(() => calculateSubjectTotal(subject)).toThrow(
        "Mathematics examination score must be between 0 and 70",
      );
    });

    test("Should reject a negative CA1 score", () => {
      const subject = createSubject({
        ca1: -1,
      });

      expect(() => calculateSubjectTotal(subject)).toThrow(
        "Mathematics CA1 must be between 0 and 20",
      );
    });

    test("Should reject a negative CA2 score", () => {
      const subject = createSubject({
        ca2: -1,
      });

      expect(() => calculateSubjectTotal(subject)).toThrow(
        "Mathematics CA2 must be between 0 and 10",
      );
    });

    test("Should reject a negative examination score", () => {
      const subject = createSubject({
        exam: -1,
      });

      expect(() => calculateSubjectTotal(subject)).toThrow(
        "Mathematics examination score must be between 0 and 70",
      );
    });

    test("Should return null scores for a subject that is not offered", () => {
      const subject = createSubject({
        offered: false,
        ca1: null,
        ca2: null,
        exam: null,
      });

      const result = calculateSubjectTotal(subject);

      expect(result.ca1).toBeNull();
      expect(result.ca2).toBeNull();
      expect(result.exam).toBeNull();
      expect(result.total).toBeNull();
      expect(result.grade).toBeNull();
      expect(result.remark).toBe("");
    });
  });

  /*
  |--------------------------------------------------------------------------
  | First / Second Term Calculation
  |--------------------------------------------------------------------------
  */

  describe("calculateRegularTermResult", () => {
    test("Should calculate the overall percentage correctly", () => {
      const subjectResults = [
        createSubject({
          subject: "math",
          subjectName: "Mathematics",
          ca1: 15,
          ca2: 8,
          exam: 60,
        }),
        createSubject({
          subject: "english",
          subjectName: "English",
          ca1: 18,
          ca2: 9,
          exam: 65,
        }),
      ];

      const result = calculateRegularTermResult(subjectResults);

      expect(result.totalScore).toBe(175);

      expect(result.totalObtainableMarks).toBe(200);

      expect(result.overallPercentage).toBe(87.5);

      expect(result.performanceComment).toBe(
        "Excellent performance. Keep up the good work.",
      );

      expect(result.promotionStatus).toBe("not_applicable");

      expect(result.principalDecision).toBe("pending");
    });

    test("Should calculate a single subject correctly", () => {
      const subjectResults = [
        createSubject({
          ca1: 10,
          ca2: 5,
          exam: 35,
        }),
      ];

      const result = calculateRegularTermResult(subjectResults);

      expect(result.totalScore).toBe(50);

      expect(result.totalObtainableMarks).toBe(100);

      expect(result.overallPercentage).toBe(50);

      expect(result.performanceComment).toBe(
        "Fair performance. Put in more effort to achieve better results.",
      );
    });

    test("Should dynamically calculate the denominator based on offered subjects", () => {
      const subjectResults = [
        createSubject({
          subject: "math",
          subjectName: "Mathematics",
          ca1: 10,
          ca2: 5,
          exam: 35,
        }),
        createSubject({
          subject: "english",
          subjectName: "English",
          offered: false,
          ca1: null,
          ca2: null,
          exam: null,
        }),
        createSubject({
          subject: "biology",
          subjectName: "Biology",
          ca1: 20,
          ca2: 10,
          exam: 70,
        }),
      ];

      const result = calculateRegularTermResult(subjectResults);

      expect(result.totalScore).toBe(150);

      expect(result.totalObtainableMarks).toBe(200);

      expect(result.overallPercentage).toBe(75);
    });

    test("Should count an offered subject with zero score in the denominator", () => {
      const subjectResults = [
        createSubject({
          subject: "math",
          subjectName: "Mathematics",
          ca1: 0,
          ca2: 0,
          exam: 0,
        }),
        createSubject({
          subject: "english",
          subjectName: "English",
          ca1: 100,
          ca2: 0,
          exam: 0,
        }),
      ];

      /*
       * The English score above is intentionally invalid and
       * should cause validation to fail.
       */
      expect(() => calculateRegularTermResult(subjectResults)).toThrow(
        "English CA1 must be between 0 and 20",
      );
    });

    test("Should correctly count an offered subject with a valid zero score", () => {
      const subjectResults = [
        createSubject({
          subject: "math",
          subjectName: "Mathematics",
          ca1: 0,
          ca2: 0,
          exam: 0,
        }),
        createSubject({
          subject: "english",
          subjectName: "English",
          ca1: 10,
          ca2: 5,
          exam: 35,
        }),
      ];

      const result = calculateRegularTermResult(subjectResults);

      expect(result.totalScore).toBe(50);

      expect(result.totalObtainableMarks).toBe(200);

      expect(result.overallPercentage).toBe(25);
    });

    test("Should reject a result with no offered subjects", () => {
      const subjectResults = [
        createSubject({
          offered: false,
          ca1: null,
          ca2: null,
          exam: null,
        }),
      ];

      expect(() => calculateRegularTermResult(subjectResults)).toThrow(
        "At least one subject must be offered",
      );
    });

    test("Should reject a non-array subject result", () => {
      expect(() => calculateRegularTermResult(null)).toThrow(
        "Subject results must be an array",
      );
    });
  });

  /*
  |--------------------------------------------------------------------------
  | Third Term Calculation
  |--------------------------------------------------------------------------
  */

  describe("calculateThirdTermResult", () => {
    test("Should calculate third-term cumulative score and weighted average", () => {
      const subjectResults = [
        createSubject({
          subject: "math",
          subjectName: "Mathematics",
          ca1: 15,
          ca2: 8,
          exam: 57,
        }),
      ];

      const firstTermResults = [
        {
          subject: "math",
          offered: true,
          total: 70,
        },
      ];

      const secondTermResults = [
        {
          subject: "math",
          offered: true,
          total: 60,
        },
      ];

      const result = calculateThirdTermResult({
        subjectResults,
        firstTermResults,
        secondTermResults,
      });

      /*
       * Third term:
       * 15 + 8 + 57 = 80
       *
       * Cumulative:
       * 70 + 60 + 80 = 210
       *
       * Weighted average:
       * 210 / 3 = 70
       */
      expect(result.subjectResults[0].total).toBe(80);

      expect(result.subjectResults[0].cumulativeScore).toBe(210);

      expect(result.subjectResults[0].weightedAverage).toBe(70);

      expect(result.subjectResults[0].grade).toBe("D");

      expect(result.subjectResults[0].remark).toBe("DISTINCTION");

      expect(result.totalScore).toBe(210);

      expect(result.totalObtainableMarks).toBe(300);

      expect(result.overallPercentage).toBe(70);

      expect(result.promotionStatus).toBe("recommended_promoted");

      expect(result.principalDecision).toBe("pending");
    });

    test("Should calculate weighted average using only applicable terms", () => {
      const subjectResults = [
        createSubject({
          subject: "math",
          subjectName: "Mathematics",
          ca1: 10,
          ca2: 7,
          exam: 50,
        }),
      ];

      const firstTermResults = [
        {
          subject: "math",
          offered: true,
          total: 70,
        },
      ];

      const secondTermResults = [
        {
          subject: "math",
          offered: false,
          total: null,
        },
      ];

      const result = calculateThirdTermResult({
        subjectResults,
        firstTermResults,
        secondTermResults,
      });

      /*
       * Third = 67
       * First = 70
       *
       * Cumulative = 137
       * Applicable terms = 2
       * Weighted average = 68.5
       */
      expect(result.subjectResults[0].total).toBe(67);

      expect(result.subjectResults[0].cumulativeScore).toBe(137);

      expect(result.subjectResults[0].weightedAverage).toBe(68.5);

      expect(result.subjectResults[0].grade).toBe("M");

      expect(result.totalScore).toBe(137);

      expect(result.totalObtainableMarks).toBe(200);

      expect(result.overallPercentage).toBe(68.5);
    });

    test("Should exclude a subject that was not offered in the third term", () => {
      const subjectResults = [
        createSubject({
          subject: "math",
          subjectName: "Mathematics",
          ca1: 15,
          ca2: 8,
          exam: 57,
        }),
        createSubject({
          subject: "french",
          subjectName: "French",
          offered: false,
          ca1: null,
          ca2: null,
          exam: null,
        }),
      ];

      const firstTermResults = [
        {
          subject: "math",
          offered: true,
          total: 70,
        },
        {
          subject: "french",
          offered: true,
          total: 80,
        },
      ];

      const secondTermResults = [
        {
          subject: "math",
          offered: true,
          total: 60,
        },
        {
          subject: "french",
          offered: false,
          total: null,
        },
      ];

      const result = calculateThirdTermResult({
        subjectResults,
        firstTermResults,
        secondTermResults,
      });

      /*
       * Mathematics:
       * First = 70
       * Second = 60
       * Third = 80
       *
       * French:
       * First = 80
       *
       * Overall:
       * 70 + 60 + 80 + 80 = 290
       * Obtainable:
       * 4 applicable subject-term combinations = 400
       */
      expect(result.totalScore).toBe(290);

      expect(result.totalObtainableMarks).toBe(400);

      expect(result.overallPercentage).toBe(72.5);

      expect(
        result.subjectResults.find((subject) => subject.subject === "french")
          .total,
      ).toBeNull();
    });

    test("Should include a previous-term subject even when it is absent from the current subject list", () => {
      const subjectResults = [
        createSubject({
          subject: "math",
          subjectName: "Mathematics",
          ca1: 15,
          ca2: 8,
          exam: 57,
        }),
      ];

      const firstTermResults = [
        {
          subject: "math",
          offered: true,
          total: 70,
        },
        {
          subject: "biology",
          offered: true,
          total: 80,
        },
      ];

      const secondTermResults = [
        {
          subject: "math",
          offered: true,
          total: 60,
        },
      ];

      const result = calculateThirdTermResult({
        subjectResults,
        firstTermResults,
        secondTermResults,
      });

      /*
       * Mathematics:
       * 70 + 60 + 80 = 210
       *
       * Biology:
       * 80 from First Term
       *
       * Overall:
       * 210 + 80 = 290
       *
       * Obtainable:
       * 300 + 100 = 400
       */
      expect(result.totalScore).toBe(290);

      expect(result.totalObtainableMarks).toBe(400);

      expect(result.overallPercentage).toBe(72.5);
    });

    test("Should count previous-term zero scores in the denominator", () => {
      const subjectResults = [
        createSubject({
          subject: "math",
          subjectName: "Mathematics",
          ca1: 10,
          ca2: 5,
          exam: 35,
        }),
      ];

      const firstTermResults = [
        {
          subject: "math",
          offered: true,
          total: 0,
        },
      ];

      const secondTermResults = [];

      const result = calculateThirdTermResult({
        subjectResults,
        firstTermResults,
        secondTermResults,
      });

      /*
       * First Term = 0
       * Third Term = 50
       *
       * Total = 50
       * Obtainable = 200
       * Overall = 25%
       */
      expect(result.totalScore).toBe(50);

      expect(result.totalObtainableMarks).toBe(200);

      expect(result.overallPercentage).toBe(25);
    });

    test("Should include zero as a valid current third-term score", () => {
      const subjectResults = [
        createSubject({
          subject: "math",
          subjectName: "Mathematics",
          ca1: 0,
          ca2: 0,
          exam: 0,
        }),
      ];

      const result = calculateThirdTermResult({
        subjectResults,
        firstTermResults: [],
        secondTermResults: [],
      });

      expect(result.subjectResults[0].total).toBe(0);

      expect(result.subjectResults[0].cumulativeScore).toBe(0);

      expect(result.subjectResults[0].weightedAverage).toBe(0);

      expect(result.subjectResults[0].grade).toBe("F");

      expect(result.totalScore).toBe(0);

      expect(result.totalObtainableMarks).toBe(100);

      expect(result.overallPercentage).toBe(0);

      expect(result.promotionStatus).toBe("recommended_repeat");
    });

    test("Should reject third term when no current subject is offered", () => {
      const subjectResults = [
        createSubject({
          subject: "math",
          subjectName: "Mathematics",
          offered: false,
          ca1: null,
          ca2: null,
          exam: null,
        }),
      ];

      expect(() =>
        calculateThirdTermResult({
          subjectResults,
          firstTermResults: [],
          secondTermResults: [],
        }),
      ).toThrow("At least one subject must be offered in Third Term");
    });

    test("Should reject third term when no obtainable marks exist", () => {
      /*
       * This condition is normally prevented by the
       * current-subject validation above.
       *
       * The test documents the intended protection.
       */
      expect(() =>
        calculateThirdTermResult({
          subjectResults: [],
          firstTermResults: [],
          secondTermResults: [],
        }),
      ).toThrow("At least one subject must be offered in Third Term");
    });
  });

  /*
  |--------------------------------------------------------------------------
  | calculateResult
  |--------------------------------------------------------------------------
  */

  describe("calculateResult", () => {
    test("Should calculate First Term through the regular calculation", () => {
      const result = calculateResult({
        term: "first",
        subjectResults: [
          createSubject({
            ca1: 10,
            ca2: 5,
            exam: 35,
          }),
        ],
      });

      expect(result.totalScore).toBe(50);

      expect(result.totalObtainableMarks).toBe(100);

      expect(result.overallPercentage).toBe(50);
    });

    test("Should calculate Second Term through the regular calculation", () => {
      const result = calculateResult({
        term: "second",
        subjectResults: [
          createSubject({
            ca1: 18,
            ca2: 9,
            exam: 63,
          }),
        ],
      });

      expect(result.totalScore).toBe(90);

      expect(result.totalObtainableMarks).toBe(100);

      expect(result.overallPercentage).toBe(90);
    });

    test("Should calculate Third Term using previous terms", () => {
      const result = calculateResult({
        term: "third",
        subjectResults: [
          createSubject({
            ca1: 15,
            ca2: 8,
            exam: 57,
          }),
        ],
        firstTermResults: [
          {
            subject: "subject-id-1",
            offered: true,
            total: 70,
          },
        ],
        secondTermResults: [
          {
            subject: "subject-id-1",
            offered: true,
            total: 60,
          },
        ],
      });

      expect(result.totalScore).toBe(210);

      expect(result.totalObtainableMarks).toBe(300);

      expect(result.overallPercentage).toBe(70);
    });

    test("Should reject an invalid term", () => {
      expect(() =>
        calculateResult({
          term: "fourth",
          subjectResults: [],
        }),
      ).toThrow("Term must be first, second, or third");
    });
  });

  /*
  |--------------------------------------------------------------------------
  | Attendance Validation
  |--------------------------------------------------------------------------
  */

  describe("validateAttendance", () => {
    test("Should validate correct attendance", () => {
      expect(
        validateAttendance({
          daysSchoolOpened: 100,
          daysPresent: 90,
          daysAbsent: 10,
        }),
      ).toEqual({
        daysSchoolOpened: 100,
        daysPresent: 90,
        daysAbsent: 10,
      });
    });

    test("Should allow zero attendance values", () => {
      expect(
        validateAttendance({
          daysSchoolOpened: 0,
          daysPresent: 0,
          daysAbsent: 0,
        }),
      ).toEqual({
        daysSchoolOpened: 0,
        daysPresent: 0,
        daysAbsent: 0,
      });
    });

    test("Should reject days present greater than days school opened", () => {
      expect(() =>
        validateAttendance({
          daysSchoolOpened: 100,
          daysPresent: 101,
          daysAbsent: 0,
        }),
      ).toThrow("Days present cannot exceed days school opened");
    });

    test("Should reject days absent greater than days school opened", () => {
      expect(() =>
        validateAttendance({
          daysSchoolOpened: 100,
          daysPresent: 0,
          daysAbsent: 101,
        }),
      ).toThrow("Days absent cannot exceed days school opened");
    });

    test("Should reject inconsistent attendance totals", () => {
      expect(() =>
        validateAttendance({
          daysSchoolOpened: 100,
          daysPresent: 80,
          daysAbsent: 10,
        }),
      ).toThrow("Days present plus days absent must equal days school opened");
    });

    test("Should reject negative days school opened", () => {
      expect(() =>
        validateAttendance({
          daysSchoolOpened: -1,
          daysPresent: 0,
          daysAbsent: 0,
        }),
      ).toThrow("Days school opened must be a non-negative whole number");
    });

    test("Should reject negative days present", () => {
      expect(() =>
        validateAttendance({
          daysSchoolOpened: 10,
          daysPresent: -1,
          daysAbsent: 11,
        }),
      ).toThrow("Days present must be a non-negative whole number");
    });

    test("Should reject negative days absent", () => {
      expect(() =>
        validateAttendance({
          daysSchoolOpened: 10,
          daysPresent: 11,
          daysAbsent: -1,
        }),
      ).toThrow("Days absent must be a non-negative whole number");
    });

    test("Should return zero attendance when attendance is missing", () => {
      expect(validateAttendance()).toEqual({
        daysSchoolOpened: 0,
        daysPresent: 0,
        daysAbsent: 0,
      });
    });
  });
});
