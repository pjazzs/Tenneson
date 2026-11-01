const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const app = require("../app");

const Teacher = require("../models/Teacher");
const Admin = require("../models/Admin");
const Student = require("../models/student");
const SchoolClass = require("../models/SchoolClass");
const Subject = require("../models/Subject");
const ClassSubjectAllocation = require("../models/ClassSubjectAllocation");
const AcademicSession = require("../models/AcademicSession");
const TeacherAssignment = require("../models/TeacherAssignment");
const SubjectResultResponsibility = require("../models/SubjectResultResponsibility");
const SubjectResultSubmission = require("../models/SubjectResultSubmission");
const SubjectResultCorrectionRequest = require("../models/SubjectResultCorrectionRequest");
const ResultRevision = require("../models/ResultRevision");
const Result = require("../models/Result");
const AuditLog = require("../models/AuditLog");

describe("TEACHER SUBJECT RESULT CORRECTION API", () => {
  let teacher;
  let secondTeacher;
  let admin;

  let student;
  let schoolClass;
  let subject;
  let allocation;
  let academicSession;

  let assignment;
  let responsibility;
  let submission;
  let result;
  let revision;
  let correctionRequest;

  const generateTeacherToken = (selectedTeacher = teacher) =>
    jwt.sign(
      {
        id: selectedTeacher._id.toString(),
        type: "teacher",
        tokenVersion: selectedTeacher.tokenVersion || 0,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

  const auth = (selectedTeacher = teacher) => ({
    Authorization: `Bearer ${generateTeacherToken(selectedTeacher)}`,
  });

  const createTeacher = async (overrides = {}) => {
    const count = await Teacher.countDocuments();

    return Teacher.create({
      fullName: `Test Teacher ${count + 1}`,
      email: `teacher${count + 1}@test.com`,
      password: "Password123!",
      mustChangePassword: false,
      isActive: true,
      ...overrides,
    });
  };

  const createCorrectionRequest = async (overrides = {}) => {
    return SubjectResultCorrectionRequest.create({
      resultRevision: revision._id,
      result: result._id,
      student: student._id,
      academicSession: academicSession._id,
      term: "first",
      subject: subject._id,
      allocation: allocation._id,
      submission: submission._id,
      submissionStudentResult: submission.studentResults[0]._id,
      responsibility: responsibility._id,
      originalSubmittingTeacher: teacher._id,
      originalTeacherAssignment: assignment._id,
      originalTeacherName: teacher.fullName,
      originalScore: {
        offered: true,
        ca1: 15,
        ca2: 8,
        exam: 60,
        teacherComment: "Original comment",
      },
      requestReason: "Please correct the student's Mathematics score.",
      requestedBy: admin._id,
      status: "pending_teacher",
      ...overrides,
    });
  };

  const submitCorrection = (
    requestId = correctionRequest._id,
    selectedTeacher = teacher,
    body = {},
  ) =>
    request(app)
      .put(`/api/v1/teacher/subject-corrections/${requestId}/submit`)
      .set(auth(selectedTeacher))
      .send({
        proposedScore: {
          ca1: 18,
          ca2: 9,
          exam: 65,
          teacherComment: "Corrected score",
        },
        teacherReason:
          "The original examination score was entered incorrectly.",
        ...body,
      });

  const getCorrection = (
    requestId = correctionRequest._id,
    selectedTeacher = teacher,
  ) =>
    request(app)
      .get(`/api/v1/teacher/subject-corrections/${requestId}`)
      .set(auth(selectedTeacher));

  beforeEach(async () => {
    admin = await Admin.create({
      fullName: "Test Administrator",
      email: "admin@test.com",
      password: "Password123!",
      role: "admin",
      isActive: true,
    });

    teacher = await createTeacher({
      fullName: "John Teacher",
      email: "john@test.com",
    });

    secondTeacher = await createTeacher({
      fullName: "Jane Teacher",
      email: "jane@test.com",
    });

    schoolClass = await SchoolClass.create({
      name: "JSS1",
      level: "junior",
      hasDepartments: false,
      isActive: true,
    });

    subject = await Subject.create({
      name: "Mathematics",
      code: "MTH",
      isActive: true,
    });

    allocation = await ClassSubjectAllocation.create({
      schoolClass: schoolClass._id,
      department: null,
      subject: subject._id,
      isActive: true,
    });

    academicSession = await AcademicSession.create({
      name: "2026/2027",
      isActive: true,
      terms: [
        {
          key: "first",
          name: "First Term",
          isActive: true,
        },
        {
          key: "second",
          name: "Second Term",
          isActive: false,
        },
        {
          key: "third",
          name: "Third Term",
          isActive: false,
        },
      ],
    });

    student = await Student.create({
      studentId: "TCC00991",
      firstName: "Test",
      lastName: "Student",
      otherName: "",
      gender: "Male",
      dateOfBirth: new Date("2010-01-01"),
      currentClass: "JSS1",
      department: null,
      session: "2026/2027",
      isActive: true,
    });

    assignment = await TeacherAssignment.create({
      teacher: teacher._id,
      allocation: allocation._id,
      academicSession: academicSession._id,
      isActive: true,
    });

    responsibility = await SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: academicSession._id,
      term: "first",
      teacherAssignment: assignment._id,
    });

    submission = await SubjectResultSubmission.create({
      allocation: allocation._id,
      academicSession: academicSession._id,
      term: "first",
      responsibility: responsibility._id,
      studentResults: [
        {
          student: student._id,
          studentId: student.studentId,
          studentName: "Test Student",
          offered: true,
          ca1: 15,
          ca2: 8,
          exam: 60,
          teacherComment: "Original comment",
        },
      ],
      status: "approved",
      createdByTeacher: teacher._id,
      updatedByTeacher: teacher._id,
      submittedByTeacher: teacher._id,
      submittedAt: new Date(),
      approvedBy: admin._id,
      approvedAt: new Date(),
    });

    result = await Result.create({
      student: student._id,
      academicSession: academicSession._id,
      term: "first",
      currentClass: "JSS1",
      subjectResults: [
        {
          subject: subject._id,
          subjectName: "Mathematics",
          subjectCode: "MTH",
          offered: true,
          ca1: 15,
          ca2: 8,
          exam: 60,
          total: 83,
          teacherComment: "Original comment",
        },
      ],
      status: "published",
      totalScore: 83,
      totalObtainableMarks: 100,
      overallPercentage: 83,
    });

    revision = await ResultRevision.create({
      result: result._id,
      student: student._id,
      academicSession: academicSession._id,
      term: "first",
      revisionNumber: 1,
      correctionSource: "subject_teacher",
      isActive: true,
      originalSnapshot: result.toObject(),
      proposedData: result.toObject(),
      reason: "Subject teacher correction request.",
      status: "draft",
      createdBy: admin._id,
    });

    correctionRequest = await createCorrectionRequest();
  });

  // ---------------------------------------------------------
  // GET MY CORRECTION REQUESTS
  // ---------------------------------------------------------

  describe("GET /api/v1/teacher/my-subject-corrections", () => {
    test("returns correction requests routed to the authenticated teacher", async () => {
      const response = await request(app)
        .get("/api/v1/teacher/my-subject-corrections")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.requests).toHaveLength(1);
    });

    test("does not return another teacher's correction requests", async () => {
      const response = await request(app)
        .get("/api/v1/teacher/my-subject-corrections")
        .set(auth(secondTeacher));

      expect(response.statusCode).toBe(200);
      expect(response.body.count).toBe(0);
      expect(response.body.requests).toEqual([]);
    });

    test("filters correction requests by status", async () => {
      const response = await request(app)
        .get("/api/v1/teacher/my-subject-corrections?status=pending_teacher")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.requests[0].status).toBe("pending_teacher");
    });

    test("rejects an invalid status filter", async () => {
      const response = await request(app)
        .get("/api/v1/teacher/my-subject-corrections?status=unknown")
        .set(auth());

      expect(response.statusCode).toBe(400);
    });

    test("rejects unauthenticated requests", async () => {
      const response = await request(app).get(
        "/api/v1/teacher/my-subject-corrections",
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ---------------------------------------------------------
  // GET ONE CORRECTION REQUEST
  // ---------------------------------------------------------

  describe("GET /api/v1/teacher/subject-corrections/:requestId", () => {
    test("returns the original score and correction details", async () => {
      const response = await getCorrection();

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.request.originalScore.ca1).toBe(15);
      expect(response.body.request.originalScore.ca2).toBe(8);
      expect(response.body.request.originalScore.exam).toBe(60);

      expect(response.body.request.requestReason).toContain(
        "correct the student's Mathematics score",
      );

      expect(response.body.request.subject.name).toBe("Mathematics");
      expect(response.body.request.student.studentId).toBe("TCC00991");
      expect(response.body.canSubmit).toBe(true);
    });

    test("does not expose another teacher's correction request", async () => {
      const response = await getCorrection(
        correctionRequest._id,
        secondTeacher,
      );

      expect(response.statusCode).toBe(404);
    });

    test("returns 404 for an unknown correction request", async () => {
      const unknownId = new mongoose.Types.ObjectId();

      const response = await getCorrection(unknownId);

      expect(response.statusCode).toBe(404);
    });

    test("rejects an invalid correction request ID", async () => {
      const response = await getCorrection("invalid-id");

      expect(response.statusCode).toBe(400);
    });

    test("does not allow a teacher to view an inactive request", async () => {
      correctionRequest.isActive = false;
      await correctionRequest.save();

      const response = await getCorrection();

      expect(response.statusCode).toBe(404);
    });
  });

  // ---------------------------------------------------------
  // SUBMIT TEACHER CORRECTION
  // ---------------------------------------------------------

  describe("PUT /api/v1/teacher/subject-corrections/:requestId/submit", () => {
    test("allows the original submitting teacher to submit corrected scores", async () => {
      const response = await submitCorrection();

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.request.status).toBe("submitted");

      expect(response.body.request.proposedScore.ca1).toBe(18);
      expect(response.body.request.proposedScore.ca2).toBe(9);
      expect(response.body.request.proposedScore.exam).toBe(65);

      expect(response.body.request.teacherReason).toContain(
        "entered incorrectly",
      );

      const savedRequest = await SubjectResultCorrectionRequest.findById(
        correctionRequest._id,
      );

      expect(savedRequest.status).toBe("submitted");
      expect(savedRequest.submittedByTeacher.toString()).toBe(
        teacher._id.toString(),
      );
      expect(savedRequest.submittedAt).toBeInstanceOf(Date);

      expect(savedRequest.events).toHaveLength(1);
      expect(savedRequest.events[0].action).toBe("teacher_submitted");
      expect(savedRequest.events[0].actorType).toBe("teacher");
    });

    test("creates an audit log after successful submission", async () => {
      const response = await submitCorrection();

      expect(response.statusCode).toBe(200);

      const log = await AuditLog.findOne({
        teacher: teacher._id,
        module: "SUBJECT_RESULT_CORRECTIONS",
        action: "SUBMIT_CORRECTION",
      });

      expect(log).not.toBeNull();
      expect(log.description).toContain("John Teacher");
      expect(log.description).toContain(correctionRequest._id.toString());
    });

    test("does not modify the published official result", async () => {
      const originalResult = await Result.findById(result._id).lean();

      const response = await submitCorrection();

      expect(response.statusCode).toBe(200);

      const updatedResult = await Result.findById(result._id).lean();

      expect(updatedResult.status).toBe("published");
      expect(updatedResult.subjectResults[0].ca1).toBe(
        originalResult.subjectResults[0].ca1,
      );
      expect(updatedResult.subjectResults[0].ca2).toBe(
        originalResult.subjectResults[0].ca2,
      );
      expect(updatedResult.subjectResults[0].exam).toBe(
        originalResult.subjectResults[0].exam,
      );
      expect(updatedResult.subjectResults[0].total).toBe(
        originalResult.subjectResults[0].total,
      );
    });

    test("does not modify the parent revision when the teacher submits", async () => {
      const originalRevision = await ResultRevision.findById(
        revision._id,
      ).lean();

      const response = await submitCorrection();

      expect(response.statusCode).toBe(200);

      const updatedRevision = await ResultRevision.findById(
        revision._id,
      ).lean();

      expect(updatedRevision.status).toBe(originalRevision.status);
      expect(updatedRevision.proposedData).toEqual(
        originalRevision.proposedData,
      );
    });

    test("rejects submission by another teacher", async () => {
      const response = await submitCorrection(
        correctionRequest._id,
        secondTeacher,
      );

      expect(response.statusCode).toBe(404);

      const savedRequest = await SubjectResultCorrectionRequest.findById(
        correctionRequest._id,
      );

      expect(savedRequest.status).toBe("pending_teacher");
    });

    test("requires a proposed score object", async () => {
      const response = await submitCorrection(correctionRequest._id, teacher, {
        proposedScore: null,
      });

      expect(response.statusCode).toBe(400);
    });

    test("requires a teacher explanation", async () => {
      const response = await submitCorrection(correctionRequest._id, teacher, {
        teacherReason: "",
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/explanation/i);
    });

    test("rejects an explanation shorter than five characters", async () => {
      const response = await submitCorrection(correctionRequest._id, teacher, {
        teacherReason: "No",
      });

      expect(response.statusCode).toBe(400);
    });

    test("rejects an explanation longer than 1000 characters", async () => {
      const response = await submitCorrection(correctionRequest._id, teacher, {
        teacherReason: "A".repeat(1001),
      });

      expect(response.statusCode).toBe(400);
    });

    test.each([
      ["CA1", { ca1: 21 }, /CA1/],
      ["CA2", { ca2: 11 }, /CA2/],
      ["Examination", { exam: 71 }, /Examination/],
      ["negative CA1", { ca1: -1 }, /CA1/],
      ["negative CA2", { ca2: -1 }, /CA2/],
      ["negative examination", { exam: -1 }, /Examination/],
    ])("rejects an invalid %s score", async (label, invalidScore, message) => {
      const response = await submitCorrection(correctionRequest._id, teacher, {
        proposedScore: {
          ca1: 18,
          ca2: 9,
          exam: 65,
          ...invalidScore,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(message);
    });

    test("rejects a missing score field", async () => {
      const response = await submitCorrection(correctionRequest._id, teacher, {
        proposedScore: {
          ca1: 18,
          ca2: 9,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/Examination score is required/i);
    });

    test("rejects a non-text teacher comment", async () => {
      const response = await submitCorrection(correctionRequest._id, teacher, {
        proposedScore: {
          ca1: 18,
          ca2: 9,
          exam: 65,
          teacherComment: 123,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/comment must be text/i);
    });

    test("rejects a teacher comment longer than 1000 characters", async () => {
      const response = await submitCorrection(correctionRequest._id, teacher, {
        proposedScore: {
          ca1: 18,
          ca2: 9,
          exam: 65,
          teacherComment: "A".repeat(1001),
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/1000 characters/i);
    });

    test("does not allow a teacher to submit the same request twice", async () => {
      const firstResponse = await submitCorrection();
      const secondResponse = await submitCorrection();

      expect(firstResponse.statusCode).toBe(200);
      expect(secondResponse.statusCode).toBe(409);
    });

    test("allows a teacher to resubmit a request returned by the administrator", async () => {
      correctionRequest.status = "returned";
      correctionRequest.adminReviewNote =
        "Please verify the examination score.";
      await correctionRequest.save();

      const response = await submitCorrection();

      expect(response.statusCode).toBe(200);
      expect(response.body.request.status).toBe("submitted");

      const savedRequest = await SubjectResultCorrectionRequest.findById(
        correctionRequest._id,
      );

      expect(savedRequest.events).toHaveLength(1);
      expect(savedRequest.events[0].action).toBe("teacher_submitted");
    });

    test.each(["submitted", "accepted", "cancelled"])(
      "does not allow editing a request with status %s",
      async (status) => {
        correctionRequest.status = status;
        await correctionRequest.save();

        const response = await submitCorrection();

        expect(response.statusCode).toBe(409);
      },
    );

    test("does not allow submission when the parent revision is no longer a draft", async () => {
      revision.status = "submitted";
      await revision.save();

      const response = await submitCorrection();

      expect(response.statusCode).toBe(409);
      expect(response.body.message).toMatch(/no longer open/i);
    });

    test("does not allow submission when the parent revision is inactive", async () => {
      revision.isActive = false;
      await revision.save();

      const response = await submitCorrection();

      expect(response.statusCode).toBe(409);
    });

    test("does not allow submission when the parent revision is not a subject-teacher revision", async () => {
      await ResultRevision.collection.updateOne(
        { _id: revision._id },
        { $set: { correctionSource: "admin" } },
      );

      const savedRevision = await ResultRevision.findById(revision._id).lean();

      expect(savedRevision.correctionSource).toBe("admin");

      const response = await submitCorrection();

      expect(response.statusCode).toBe(409);
    });

    test("rejects an inactive correction request", async () => {
      correctionRequest.isActive = false;
      await correctionRequest.save();

      const response = await submitCorrection();

      expect(response.statusCode).toBe(404);
    });

    test("rejects an invalid correction request ID", async () => {
      const response = await submitCorrection("invalid-id");

      expect(response.statusCode).toBe(400);
    });

    test("rejects unauthenticated submission", async () => {
      const response = await request(app)
        .put(
          `/api/v1/teacher/subject-corrections/${correctionRequest._id}/submit`,
        )
        .send({
          proposedScore: {
            ca1: 18,
            ca2: 9,
            exam: 65,
          },
          teacherReason: "Corrected examination score.",
        });

      expect(response.statusCode).toBe(401);
    });
  });
});
