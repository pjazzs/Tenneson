const mongoose = require("mongoose");

jest.mock("../../models/SubjectResultResponsibility", () => ({
  findById: jest.fn(),
}));

const SubjectResultResponsibility = require("../../models/SubjectResultResponsibility");
const SubjectResultSubmission = require("../../models/SubjectResultSubmission");

describe("SubjectResultSubmission Model", () => {
  const allocationId = new mongoose.Types.ObjectId();
  const academicSessionId = new mongoose.Types.ObjectId();
  const responsibilityId = new mongoose.Types.ObjectId();
  const teacherId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();

  const mockResponsibility = (overrides = {}) => {
    const responsibility = {
      allocation: allocationId,
      academicSession: academicSessionId,
      term: "first",
      ...overrides,
    };

    SubjectResultResponsibility.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(responsibility),
    });
  };

  const createSubmission = (overrides = {}) => {
    return new SubjectResultSubmission({
      allocation: allocationId,
      academicSession: academicSessionId,
      term: "first",
      responsibility: responsibilityId,
      createdByTeacher: teacherId,
      studentResults: [
        {
          student: studentId,
          studentId: "TCC00001",
          studentName: "Test Student",
          ca1: 15,
          ca2: 8,
          exam: 60,
        },
      ],
      ...overrides,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockResponsibility();
  });

  describe("Required fields and defaults", () => {
    test("should create a valid draft submission", async () => {
      const submission = createSubmission();

      await expect(submission.validate()).resolves.toBeUndefined();

      expect(submission.status).toBe("draft");
      expect(submission.studentResults).toHaveLength(1);
      expect(submission.submittedAt).toBeNull();
      expect(submission.submittedByTeacher).toBeNull();
    });

    test("should reject a missing allocation", async () => {
      const submission = createSubmission({
        allocation: null,
      });

      await expect(submission.validate()).rejects.toThrow(
        "Subject allocation is required.",
      );
    });

    test("should reject a missing academic session", async () => {
      const submission = createSubmission({
        academicSession: null,
      });

      await expect(submission.validate()).rejects.toThrow(
        "Academic session is required.",
      );
    });

    test("should reject an invalid term", async () => {
      const submission = createSubmission({
        term: "fourth",
      });

      await expect(submission.validate()).rejects.toThrow();
    });

    test("should reject a missing responsibility", async () => {
      const submission = createSubmission({
        responsibility: null,
      });

      await expect(submission.validate()).rejects.toThrow(
        "Subject result responsibility is required.",
      );
    });

    test("should reject a missing creating teacher", async () => {
      const submission = createSubmission({
        createdByTeacher: null,
      });

      await expect(submission.validate()).rejects.toThrow(
        "Creating teacher is required.",
      );
    });
  });

  describe("Score validation", () => {
    test("should accept valid CA1, CA2 and examination scores", async () => {
      const submission = createSubmission();

      await expect(submission.validate()).resolves.toBeUndefined();
    });

    test.each([
      ["CA1 below minimum", { ca1: -1 }],
      ["CA1 above maximum", { ca1: 21 }],
      ["CA2 below minimum", { ca2: -1 }],
      ["CA2 above maximum", { ca2: 11 }],
      ["Exam below minimum", { exam: -1 }],
      ["Exam above maximum", { exam: 71 }],
    ])("should reject %s", async (description, scoreOverride) => {
      const submission = createSubmission({
        studentResults: [
          {
            student: studentId,
            studentId: "TCC00001",
            studentName: "Test Student",
            ca1: 15,
            ca2: 8,
            exam: 60,
            ...scoreOverride,
          },
        ],
      });

      await expect(submission.validate()).rejects.toThrow();
    });

    test("should allow incomplete scores while the submission is a draft", async () => {
      const submission = createSubmission({
        studentResults: [
          {
            student: studentId,
            studentId: "TCC00001",
            studentName: "Test Student",
            ca1: 15,
            ca2: null,
            exam: null,
          },
        ],
      });

      await expect(submission.validate()).resolves.toBeUndefined();
    });
  });

  describe("Student entry validation", () => {
    test("should reject duplicate student entries", async () => {
      const secondStudentEntry = {
        student: studentId,
        studentId: "TCC00001",
        studentName: "Test Student",
        ca1: 10,
        ca2: 5,
        exam: 50,
      };

      const submission = createSubmission({
        studentResults: [
          {
            student: studentId,
            studentId: "TCC00001",
            studentName: "Test Student",
            ca1: 15,
            ca2: 8,
            exam: 60,
          },
          secondStudentEntry,
        ],
      });

      await expect(submission.validate()).rejects.toThrow(
        "A student cannot appear more than once in this submission.",
      );
    });

    test("should allow multiple different students", async () => {
      const secondStudentId = new mongoose.Types.ObjectId();

      const submission = createSubmission({
        studentResults: [
          {
            student: studentId,
            studentId: "TCC00001",
            studentName: "First Student",
            ca1: 15,
            ca2: 8,
            exam: 60,
          },
          {
            student: secondStudentId,
            studentId: "TCC00002",
            studentName: "Second Student",
            ca1: 12,
            ca2: 7,
            exam: 55,
          },
        ],
      });

      await expect(submission.validate()).resolves.toBeUndefined();
    });
  });

  describe("Submission status", () => {
    test("should accept draft status", async () => {
      const submission = createSubmission({
        status: "draft",
      });

      await expect(submission.validate()).resolves.toBeUndefined();
    });

    test("should accept submitted status", async () => {
      const submission = createSubmission({
        status: "submitted",
        submittedByTeacher: teacherId,
        submittedAt: new Date(),
      });

      await expect(submission.validate()).resolves.toBeUndefined();
    });

    test("should reject an unsupported status", async () => {
      const submission = createSubmission({
        status: "approved",
      });

      await expect(submission.validate()).rejects.toThrow();
    });
  });

  describe("Responsibility matching", () => {
    test("should accept a matching responsibility", async () => {
      mockResponsibility();

      const submission = createSubmission();

      await expect(submission.validate()).resolves.toBeUndefined();
    });

    test("should reject a nonexistent responsibility", async () => {
      SubjectResultResponsibility.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const submission = createSubmission();

      await expect(submission.validate()).rejects.toThrow(
        "Subject result responsibility does not exist.",
      );
    });

    test("should reject a responsibility belonging to another allocation", async () => {
      mockResponsibility({
        allocation: new mongoose.Types.ObjectId(),
      });

      const submission = createSubmission();

      await expect(submission.validate()).rejects.toThrow(
        "Responsibility does not belong to this subject allocation.",
      );
    });

    test("should reject a responsibility belonging to another academic session", async () => {
      mockResponsibility({
        academicSession: new mongoose.Types.ObjectId(),
      });

      const submission = createSubmission();

      await expect(submission.validate()).rejects.toThrow(
        "Responsibility does not belong to this academic session.",
      );
    });

    test("should reject a responsibility belonging to another term", async () => {
      mockResponsibility({
        term: "second",
      });

      const submission = createSubmission();

      await expect(submission.validate()).rejects.toThrow(
        "Responsibility does not belong to this academic term.",
      );
    });
  });

  describe("Schema indexes", () => {
    test("should define a unique allocation/session/term index", () => {
      const indexes = SubjectResultSubmission.schema.indexes();

      const uniqueIndex = indexes.find(
        ([fields, options]) =>
          fields.allocation === 1 &&
          fields.academicSession === 1 &&
          fields.term === 1 &&
          options.unique === true,
      );

      expect(uniqueIndex).toBeDefined();
      expect(uniqueIndex[1].name).toBe("unique_subject_result_submission");
    });
  });
});
