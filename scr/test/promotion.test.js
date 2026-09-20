const mongoose = require("mongoose");

const Promotion = require("../models/Promotion");
const Student = require("../models/student");
const Admin = require("../models/Admin");
const AcademicSession = require("../models/AcademicSession");
const Subject = require("../models/Subject");
const Result = require("../models/Result");

jest.setTimeout(120000);

describe("Promotion Model", () => {
  let admin;
  let student;
  let secondStudent;

  let fromSession;
  let toSession;

  let subject;
  let sourceResult;

  const createAdmin = async () => {
    return Admin.create({
      fullName: "Promotion Admin",
      email: `promotion-${Date.now()}-${Math.random()}@example.com`,
      password: "Password123!",
      role: "admin",
      permissions: [
        "results.create",
        "results.view",
        "results.update",
        "results.submit",
        "results.approve",
        "results.publish",
      ],
    });
  };

  const createStudent = async ({
    studentId,
    firstName,
    lastName,
    currentClass = "JSS2",
    session = "2025/2026",
  }) => {
    return Student.create({
      studentId,
      firstName,
      lastName,
      otherName: "",
      gender: "Male",
      dateOfBirth: new Date("2012-01-15"),
      currentClass,
      session,
      parentName: "Parent",
      parentPhone: "08012345678",
      isActive: true,
    });
  };

  const createAcademicSession = async ({ name, isActive = false }) => {
    return AcademicSession.create({
      name,
      isActive,
      terms: [
        {
          key: "first",
          name: "First Term",
          isActive: false,
        },
        {
          key: "second",
          name: "Second Term",
          isActive: false,
        },
        {
          key: "third",
          name: "Third Term",
          isActive: true,
        },
      ],
    });
  };

  const createSubject = async () => {
    return Subject.create({
      name: `Mathematics ${Date.now()}-${Math.random()}`,
      code: `MATH-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      isActive: true,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Create a valid Result fixture
  |--------------------------------------------------------------------------
  |
  | This follows the same structure already used successfully in
  | result.test.js instead of inventing a reduced Result document.
  |
  */

  const createSourceResult = async ({
    resultStudent = student,
    resultSession = fromSession,
    resultSubject = subject,
    currentClass = resultStudent.currentClass,
  } = {}) => {
    return Result.create({
      student: resultStudent._id,

      academicSession: resultSession._id,

      term: "third",

      currentClass,

      subjectResults: [
        {
          subject: resultSubject._id,
          subjectName: resultSubject.name,
          subjectCode: resultSubject.code,

          offered: true,

          ca1: 15,
          ca2: 8,
          exam: 60,

          total: 83,

          firstTerm: {
            offered: false,
            total: null,
          },

          secondTerm: {
            offered: false,
            total: null,
          },

          cumulativeScore: 83,

          weightedAverage: 83,

          grade: "D",

          remark: "DISTINCTION",

          teacherComment: "Good performance.",
        },
      ],

      attendance: {
        daysSchoolOpened: 60,
        daysPresent: 55,
        daysAbsent: 5,
      },

      affectiveDomain: {
        punctuality: 4,
        attentiveness: 4,
        neatness: 5,
        politeness: 4,
        reliability: 4,
        honesty: 5,
        initiative: 4,
        attitudeToWork: 4,
      },

      psychomotorDomain: {
        sportingActivities: 4,
        handWriting: 4,
        fluency: 4,
        drawingAndPainting: 3,
        musicalAbility: 4,
      },

      conduct: "good",

      specialReport: "Good performance.",

      sports: [],

      clubs: [],

      comments: {
        classTeacher: "A good student. Keep working hard.",
        principal: "Approved.",
        performance: "",
      },

      termDates: {
        closingDate: null,
        resumptionDate: null,
      },

      totalScore: 83,

      totalObtainableMarks: 100,

      overallPercentage: 83,

      performanceComment: "Excellent performance.",

      promotionStatus: "recommended_promoted",

      principalDecision: "promoted",

      status: "published",

      createdBy: admin._id,

      updatedBy: admin._id,

      submittedBy: admin._id,

      submittedAt: new Date(),

      approvedBy: admin._id,

      approvedAt: new Date(),

      publishedBy: admin._id,

      publishedAt: new Date(),
    });
  };

  beforeEach(async () => {
    admin = await createAdmin();

    student = await createStudent({
      studentId: `TCC${Date.now()}${Math.floor(Math.random() * 10000)}`,
      firstName: "Promotion",
      lastName: "Student",
      currentClass: "JSS2",
    });

    secondStudent = await createStudent({
      studentId: `TCC${Date.now()}${Math.floor(Math.random() * 10000)}`,
      firstName: "Second",
      lastName: "Student",
      currentClass: "JSS2",
    });

    fromSession = await createAcademicSession({
      name: `2025/2026-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      isActive: true,
    });

    toSession = await createAcademicSession({
      name: `2026/2027-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      isActive: false,
    });

    subject = await createSubject();

    sourceResult = await createSourceResult();
  });

  test("should create a promotion record", async () => {
    const promotion = await Promotion.create({
      student: student._id,
      sourceResult: sourceResult._id,
      fromSession: fromSession._id,
      toSession: toSession._id,
      fromClass: "JSS2",
      toClass: "JSS3",
      decision: "promoted",
      appliedBy: admin._id,
    });

    expect(promotion).toBeDefined();

    expect(promotion.student.toString()).toBe(student._id.toString());

    expect(promotion.sourceResult.toString()).toBe(sourceResult._id.toString());

    expect(promotion.fromSession.toString()).toBe(fromSession._id.toString());

    expect(promotion.toSession.toString()).toBe(toSession._id.toString());

    expect(promotion.fromClass).toBe("JSS2");
    expect(promotion.toClass).toBe("JSS3");
    expect(promotion.decision).toBe("promoted");

    expect(promotion.appliedBy.toString()).toBe(admin._id.toString());

    expect(promotion.appliedAt).toBeDefined();
  });

  test("should allow a repeat decision", async () => {
    const promotion = await Promotion.create({
      student: student._id,
      sourceResult: sourceResult._id,
      fromSession: fromSession._id,
      toSession: toSession._id,
      fromClass: "JSS2",
      toClass: "JSS2",
      decision: "repeat",
      appliedBy: admin._id,
    });

    expect(promotion.decision).toBe("repeat");
    expect(promotion.toClass).toBe("JSS2");
  });

  test("should allow graduation as a promotion decision", async () => {
    const promotion = await Promotion.create({
      student: student._id,
      sourceResult: sourceResult._id,
      fromSession: fromSession._id,
      toSession: toSession._id,
      fromClass: "SS3",
      toClass: "Graduated",
      decision: "graduated",
      appliedBy: admin._id,
    });

    expect(promotion.decision).toBe("graduated");
    expect(promotion.fromClass).toBe("SS3");
    expect(promotion.toClass).toBe("Graduated");
  });

  test("should reject an invalid decision", async () => {
    await expect(
      Promotion.create({
        student: student._id,
        sourceResult: sourceResult._id,
        fromSession: fromSession._id,
        toSession: toSession._id,
        fromClass: "JSS2",
        toClass: "JSS3",
        decision: "invalid_decision",
        appliedBy: admin._id,
      }),
    ).rejects.toThrow(/validation/i);
  });

  test("should prevent the same result from being used twice", async () => {
    const payload = {
      student: student._id,
      sourceResult: sourceResult._id,
      fromSession: fromSession._id,
      toSession: toSession._id,
      fromClass: "JSS2",
      toClass: "JSS3",
      decision: "promoted",
      appliedBy: admin._id,
    };

    await Promotion.create(payload);

    await expect(
      Promotion.create({
        ...payload,

        /*
         * sourceResult is the unique field being tested.
         * Use a different student/session combination so that
         * the Promotion { student, fromSession } index does not
         * interfere with this test.
         */
        student: secondStudent._id,
        fromSession: toSession._id,
      }),
    ).rejects.toMatchObject({
      code: 11000,
    });
  });

  test("should prevent two promotions for the same student from the same session", async () => {
    await Promotion.create({
      student: student._id,
      sourceResult: sourceResult._id,
      fromSession: fromSession._id,
      toSession: toSession._id,
      fromClass: "JSS2",
      toClass: "JSS3",
      decision: "promoted",
      appliedBy: admin._id,
    });

    /*
     * We deliberately reuse the same source result here.
     *
     * The sourceResult unique index is already occupied, so we
     * need a different result to isolate the student/fromSession
     * uniqueness test.
     *
     * Therefore create the second result for a DIFFERENT student.
     */

    const secondStudentResult = await createSourceResult({
      resultStudent: secondStudent,
      currentClass: "JSS2",
    });

    await expect(
      Promotion.create({
        student: student._id,
        sourceResult: secondStudentResult._id,
        fromSession: fromSession._id,
        toSession: toSession._id,
        fromClass: "JSS2",
        toClass: "JSS3",
        decision: "promoted",
        appliedBy: admin._id,
      }),
    ).rejects.toMatchObject({
      code: 11000,
    });
  });

  test("should store an optional note", async () => {
    const promotion = await Promotion.create({
      student: student._id,
      sourceResult: sourceResult._id,
      fromSession: fromSession._id,
      toSession: toSession._id,
      fromClass: "JSS2",
      toClass: "JSS3",
      decision: "promoted",
      appliedBy: admin._id,
      note: "Promoted based on final third-term performance.",
    });

    expect(promotion.note).toBe(
      "Promoted based on final third-term performance.",
    );
  });
});
