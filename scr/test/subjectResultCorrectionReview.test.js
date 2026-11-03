const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const app = require("../app");

const Admin = require("../models/Admin");
const Teacher = require("../models/Teacher");
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

describe("ADMIN SUBJECT RESULT CORRECTION REVIEW API", () => {
  let admin;
  let viewOnlyAdmin;
  let teacher;

  let student;
  let schoolClass;
  let mathematics;
  let english;
  let allocation;
  let academicSession;

  let assignment;
  let responsibility;
  let submission;
  let result;
  let revision;
  let correctionRequest;

  // ---------------------------------------------------------
  // AUTHENTICATION HELPERS
  // ---------------------------------------------------------

  const createAdmin = async (overrides = {}) => {
    const count = await Admin.countDocuments();

    return Admin.create({
      fullName: `Correction Review Admin ${count + 1}`,
      email: `correction-review-${count + 1}@test.com`,
      password: "Password123!",
      role: "admin",
      permissions: ["results.view", "results.approve"],
      isActive: true,
      ...overrides,
    });
  };

  const tokenFor = (selectedAdmin) =>
    jwt.sign(
      {
        id: selectedAdmin._id.toString(),
        type: "admin",
        tokenVersion: selectedAdmin.tokenVersion || 0,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

  const auth = (selectedAdmin = admin) => ({
    Authorization: `Bearer ${tokenFor(selectedAdmin)}`,
  });

  const requestUrl = (id) => `/api/v1/subject-result-correction-requests/${id}`;

  // ---------------------------------------------------------
  // CORRECTION REQUEST FIXTURE
  // ---------------------------------------------------------

  const createCorrectionRequest = async (overrides = {}) => {
    return SubjectResultCorrectionRequest.create({
      resultRevision: revision._id,
      result: result._id,
      student: student._id,
      academicSession: academicSession._id,
      term: "first",
      subject: mathematics._id,
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
        teacherComment: "Original mathematics comment",
      },

      proposedScore: {
        offered: true,
        ca1: 18,
        ca2: 9,
        exam: 65,
        teacherComment: "Corrected mathematics comment",
      },

      requestReason: "Please correct the mathematics score.",

      teacherReason: "The original examination score was entered incorrectly.",

      requestedBy: admin._id,
      submittedByTeacher: teacher._id,
      submittedAt: new Date(),
      status: "submitted",

      ...overrides,
    });
  };

  // ---------------------------------------------------------
  // INITIAL TEST DATA
  // ---------------------------------------------------------

  beforeEach(async () => {
    admin = await createAdmin({
      fullName: "Correction Review Administrator",
      email: "correction-review-admin@test.com",
    });

    viewOnlyAdmin = await createAdmin({
      fullName: "View Only Administrator",
      email: "correction-view-only@test.com",
      permissions: ["results.view"],
    });

    teacher = await Teacher.create({
      fullName: "Original Subject Teacher",
      email: "original-subject-teacher@test.com",
      password: "Password123!",
      mustChangePassword: false,
      isActive: true,
    });

    schoolClass = await SchoolClass.create({
      name: "JSS1",
      level: "junior",
      hasDepartments: false,
      isActive: true,
    });

    mathematics = await Subject.create({
      name: "Mathematics",
      code: "MTH",
      isActive: true,
    });

    english = await Subject.create({
      name: "English Language",
      code: "ENG",
      isActive: true,
    });

    allocation = await ClassSubjectAllocation.create({
      schoolClass: schoolClass._id,
      department: null,
      subject: mathematics._id,
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
      studentId: "TCC00992",
      firstName: "Review",
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
          studentName: "Review Student",
          offered: true,
          ca1: 15,
          ca2: 8,
          exam: 60,
          teacherComment: "Original mathematics comment",
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
          subject: mathematics._id,
          subjectName: "Mathematics",
          subjectCode: "MTH",
          offered: true,
          ca1: 15,
          ca2: 8,
          exam: 60,
          total: 83,
          teacherComment: "Original mathematics comment",
        },
        {
          subject: english._id,
          subjectName: "English Language",
          subjectCode: "ENG",
          offered: true,
          ca1: 12,
          ca2: 7,
          exam: 55,
          total: 74,
          teacherComment: "Original English comment",
        },
      ],

      status: "published",
      totalScore: 157,
      totalObtainableMarks: 200,
      overallPercentage: 78.5,
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

      proposedData: {
        student: student._id.toString(),
        academicSession: academicSession._id.toString(),
        term: "first",
        currentClass: "JSS1",

        subjectResults: [
          {
            subjectId: mathematics._id.toString(),
            subject: mathematics._id.toString(),
            subjectName: "Mathematics",
            subjectCode: "MTH",
            offered: true,
            ca1: 15,
            ca2: 8,
            exam: 60,
            teacherComment: "Original mathematics comment",
          },
          {
            subjectId: english._id.toString(),
            subject: english._id.toString(),
            subjectName: "English Language",
            subjectCode: "ENG",
            offered: true,
            ca1: 12,
            ca2: 7,
            exam: 55,
            teacherComment: "Original English comment",
          },
        ],
      },

      reason: "Subject teacher correction request.",
      status: "draft",
      createdBy: admin._id,
      updatedBy: admin._id,
    });

    correctionRequest = await createCorrectionRequest();
  });

  // ---------------------------------------------------------
  // LIST CORRECTION REQUESTS
  // ---------------------------------------------------------

  describe("GET /api/v1/subject-result-correction-requests", () => {
    test("lists submitted requests by default", async () => {
      const response = await request(app)
        .get("/api/v1/subject-result-correction-requests")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.correctionRequests).toHaveLength(1);
      expect(response.body.correctionRequests[0].status).toBe("submitted");

      expect(response.body.pagination.total).toBe(1);
      expect(response.body.pagination.page).toBe(1);
    });

    test("returns populated student, subject and teacher information", async () => {
      const response = await request(app)
        .get("/api/v1/subject-result-correction-requests")
        .set(auth());

      expect(response.statusCode).toBe(200);

      const item = response.body.correctionRequests[0];

      expect(item.student.studentId).toBe("TCC00992");
      expect(item.subject.name).toBe("Mathematics");
      expect(item.academicSession.name).toBe("2026/2027");

      expect(item.originalSubmittingTeacher.fullName).toBe(
        "Original Subject Teacher",
      );

      expect(item.resultRevision.status).toBe("draft");
    });

    test("filters requests by status", async () => {
      await createCorrectionRequest({
        subject: english._id,
        status: "pending_teacher",
        proposedScore: null,
        submittedByTeacher: null,
        submittedAt: null,
      });

      const response = await request(app)
        .get("/api/v1/subject-result-correction-requests")
        .query({ status: "pending_teacher" })
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.correctionRequests).toHaveLength(1);
      expect(response.body.correctionRequests[0].status).toBe(
        "pending_teacher",
      );
    });

    test("returns all statuses when status=all", async () => {
      await createCorrectionRequest({
        subject: english._id,
        status: "pending_teacher",
        proposedScore: null,
        submittedByTeacher: null,
        submittedAt: null,
      });

      const response = await request(app)
        .get("/api/v1/subject-result-correction-requests")
        .query({ status: "all" })
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.correctionRequests).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    test("filters by academic session, term and parent revision", async () => {
      const response = await request(app)
        .get("/api/v1/subject-result-correction-requests")
        .query({
          academicSessionId: academicSession._id.toString(),
          term: "first",
          resultRevisionId: revision._id.toString(),
        })
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.correctionRequests).toHaveLength(1);
      expect(response.body.pagination.total).toBe(1);
    });

    test("supports pagination", async () => {
      await createCorrectionRequest({
        subject: english._id,
        status: "pending_teacher",
        proposedScore: null,
        submittedByTeacher: null,
        submittedAt: null,
      });

      const response = await request(app)
        .get("/api/v1/subject-result-correction-requests")
        .query({
          status: "all",
          page: 1,
          limit: 1,
        })
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.correctionRequests).toHaveLength(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBe(2);
      expect(response.body.pagination.totalPages).toBe(2);
    });

    test("rejects invalid status, term and object IDs", async () => {
      const invalidStatus = await request(app)
        .get("/api/v1/subject-result-correction-requests")
        .query({ status: "waiting" })
        .set(auth());

      const invalidTerm = await request(app)
        .get("/api/v1/subject-result-correction-requests")
        .query({ term: "fourth" })
        .set(auth());

      const invalidSession = await request(app)
        .get("/api/v1/subject-result-correction-requests")
        .query({ academicSessionId: "invalid-id" })
        .set(auth());

      const invalidRevision = await request(app)
        .get("/api/v1/subject-result-correction-requests")
        .query({ resultRevisionId: "invalid-id" })
        .set(auth());

      expect(invalidStatus.statusCode).toBe(400);
      expect(invalidTerm.statusCode).toBe(400);
      expect(invalidSession.statusCode).toBe(400);
      expect(invalidRevision.statusCode).toBe(400);
    });

    test("requires authentication", async () => {
      const response = await request(app).get(
        "/api/v1/subject-result-correction-requests",
      );

      expect(response.statusCode).toBe(401);
    });

    test("requires results.view permission", async () => {
      const response = await request(app)
        .get("/api/v1/subject-result-correction-requests")
        .set(auth(viewOnlyAdmin));

      expect(response.statusCode).toBe(200);
    });
  });

  // ---------------------------------------------------------
  // GET ONE CORRECTION REQUEST
  // ---------------------------------------------------------

  describe("GET /api/v1/subject-result-correction-requests/:id", () => {
    test("returns one populated correction request", async () => {
      const response = await request(app)
        .get(requestUrl(correctionRequest._id))
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.correctionRequest._id).toBe(
        correctionRequest._id.toString(),
      );

      expect(response.body.correctionRequest.subject.name).toBe("Mathematics");

      expect(response.body.correctionRequest.originalScore.ca1).toBe(15);
      expect(response.body.correctionRequest.proposedScore.ca1).toBe(18);
    });

    test("rejects invalid request IDs", async () => {
      const response = await request(app)
        .get(requestUrl("invalid-id"))
        .set(auth());

      expect(response.statusCode).toBe(400);
    });

    test("returns 404 for a missing correction request", async () => {
      const missingId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(requestUrl(missingId))
        .set(auth());

      expect(response.statusCode).toBe(404);
    });
  });

  // ---------------------------------------------------------
  // ACCEPT CORRECTION REQUEST
  // ---------------------------------------------------------

  describe("PATCH /api/v1/subject-result-correction-requests/:id/accept", () => {
    const acceptRequest = (id = correctionRequest._id, body = {}) =>
      request(app)
        .patch(`${requestUrl(id)}/accept`)
        .set(auth())
        .send(body);

    test("accepts the teacher proposal and merges it into the correct subject", async () => {
      const response = await acceptRequest(correctionRequest._id, {
        note: "Scores verified against the examination record.",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.correctionRequest.status).toBe("accepted");

      const savedRevision = await ResultRevision.findById(revision._id).lean();

      const mathematicsResult = savedRevision.proposedData.subjectResults.find(
        (item) => item.subjectId === mathematics._id.toString(),
      );

      const englishResult = savedRevision.proposedData.subjectResults.find(
        (item) => item.subjectId === english._id.toString(),
      );

      expect(mathematicsResult.ca1).toBe(18);
      expect(mathematicsResult.ca2).toBe(9);
      expect(mathematicsResult.exam).toBe(65);

      expect(mathematicsResult.teacherComment).toBe(
        "Corrected mathematics comment",
      );

      // The English result must remain untouched.
      expect(englishResult.ca1).toBe(12);
      expect(englishResult.ca2).toBe(7);
      expect(englishResult.exam).toBe(55);

      expect(englishResult.teacherComment).toBe("Original English comment");

      // Acceptance does not submit or publish the parent revision.
      expect(savedRevision.status).toBe("draft");

      expect(
        savedRevision.events.some((event) => event.action === "updated"),
      ).toBe(true);

      const savedRequest = await SubjectResultCorrectionRequest.findById(
        correctionRequest._id,
      );

      expect(savedRequest.status).toBe("accepted");

      expect(savedRequest.reviewedBy.toString()).toBe(admin._id.toString());

      expect(savedRequest.adminReviewNote).toBe(
        "Scores verified against the examination record.",
      );

      expect(savedRequest.events[0].action).toBe("accepted");
    });

    test("does not change the official published result", async () => {
      const originalResult = await Result.findById(result._id).lean();

      const response = await acceptRequest();

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

    test("records an administrator audit log after acceptance", async () => {
      const response = await acceptRequest();

      expect(response.statusCode).toBe(200);

      const auditLog = await AuditLog.findOne({
        user: admin._id,
        action: "ACCEPT_SUBJECT_RESULT_CORRECTION_REQUEST",
        module: "SUBJECT_RESULT_CORRECTIONS",
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog.description).toContain(correctionRequest._id.toString());
    });

    test("rejects acceptance when the proposed score is missing", async () => {
      await SubjectResultCorrectionRequest.collection.updateOne(
        { _id: correctionRequest._id },
        { $unset: { proposedScore: "" } },
      );

      const response = await acceptRequest(correctionRequest._id, {
        note: "Attempted acceptance without a proposed score.",
      });

      expect(response.statusCode).toBe(400);

      const savedRevision = await ResultRevision.findById(revision._id).lean();
      const mathematicsResult = savedRevision.proposedData.subjectResults.find(
        (item) => item.subjectId === mathematics._id.toString(),
      );

      expect(mathematicsResult.ca1).toBe(15);
    });

    test("rejects a proposed score that changes whether the student offered the subject", async () => {
      await SubjectResultCorrectionRequest.collection.updateOne(
        { _id: correctionRequest._id },
        { $set: { "proposedScore.offered": false } },
      );

      const response = await acceptRequest(correctionRequest._id, {
        note: "Attempted to change subject offering status.",
      });

      expect(response.statusCode).toBe(409);

      const savedRevision = await ResultRevision.findById(revision._id).lean();
      const mathematicsResult = savedRevision.proposedData.subjectResults.find(
        (item) => item.subjectId === mathematics._id.toString(),
      );

      expect(mathematicsResult.ca1).toBe(15);
    });

    test("rejects a non-text teacher comment in the proposed score", async () => {
      await SubjectResultCorrectionRequest.collection.updateOne(
        { _id: correctionRequest._id },
        { $set: { "proposedScore.teacherComment": 123 } },
      );

      const response = await acceptRequest(correctionRequest._id, {
        note: "Attempted acceptance with an invalid teacher comment.",
      });

      expect(response.statusCode).toBe(400);
    });

    test("rejects a proposed teacher comment longer than 1000 characters", async () => {
      await SubjectResultCorrectionRequest.collection.updateOne(
        { _id: correctionRequest._id },
        { $set: { "proposedScore.teacherComment": "x".repeat(1001) } },
      );

      const response = await acceptRequest(correctionRequest._id, {
        note: "Attempted acceptance with an oversized teacher comment.",
      });

      expect(response.statusCode).toBe(400);
    });

    test("does not accept a correction when its subject is missing from the parent revision", async () => {
      await ResultRevision.updateOne(
        { _id: revision._id },
        {
          $set: {
            "proposedData.subjectResults": [
              {
                subjectId: english._id.toString(),
                subject: english._id.toString(),
                subjectName: "English Language",
                subjectCode: "ENG",
                offered: true,
                ca1: 12,
                ca2: 7,
                exam: 55,
                teacherComment: "Original English comment",
              },
            ],
          },
        },
      );

      const response = await acceptRequest(correctionRequest._id, {
        note: "Attempted acceptance for a missing subject.",
      });

      expect(response.statusCode).toBe(409);

      const savedRequest = await SubjectResultCorrectionRequest.findById(
        correctionRequest._id,
      ).lean();
      const savedRevision = await ResultRevision.findById(revision._id).lean();

      expect(savedRequest.status).toBe("submitted");
      expect(savedRevision.proposedData.subjectResults).toHaveLength(1);
      expect(savedRevision.proposedData.subjectResults[0].subjectId).toBe(
        english._id.toString(),
      );
    });

    test("does not accept a correction when its subject appears more than once in the parent revision", async () => {
      const duplicateMathematics = {
        subjectId: mathematics._id.toString(),
        subject: mathematics._id.toString(),
        subjectName: "Mathematics",
        subjectCode: "MTH",
        offered: true,
        ca1: 15,
        ca2: 8,
        exam: 60,
        teacherComment: "Duplicate mathematics entry",
      };

      await ResultRevision.updateOne(
        { _id: revision._id },
        {
          $push: {
            "proposedData.subjectResults": duplicateMathematics,
          },
        },
      );

      const response = await acceptRequest(correctionRequest._id, {
        note: "Attempted acceptance for a duplicated subject.",
      });

      expect(response.statusCode).toBe(409);

      const savedRequest = await SubjectResultCorrectionRequest.findById(
        correctionRequest._id,
      ).lean();
      const savedRevision = await ResultRevision.findById(revision._id).lean();

      expect(savedRequest.status).toBe("submitted");
      expect(
        savedRevision.proposedData.subjectResults.filter(
          (item) => item.subjectId === mathematics._id.toString(),
        ),
      ).toHaveLength(2);
    });

    test("rejects invalid request IDs", async () => {
      const response = await acceptRequest("invalid-id", {
        note: "Accept this correction.",
      });

      expect(response.statusCode).toBe(400);
    });

    test("rejects non-text review notes", async () => {
      const response = await acceptRequest(correctionRequest._id, {
        note: 123,
      });

      expect(response.statusCode).toBe(400);
    });

    test("rejects review notes longer than 2000 characters", async () => {
      const response = await acceptRequest(correctionRequest._id, {
        note: "x".repeat(2001),
      });

      expect(response.statusCode).toBe(400);
    });

    test("requires results.approve permission", async () => {
      const response = await request(app)
        .patch(`${requestUrl(correctionRequest._id)}/accept`)
        .set(auth(viewOnlyAdmin))
        .send({ note: "Accept this correction." });

      expect(response.statusCode).toBe(403);

      const savedRequest = await SubjectResultCorrectionRequest.findById(
        correctionRequest._id,
      );

      expect(savedRequest.status).toBe("submitted");
    });

    test("cannot accept a request that is still pending teacher submission", async () => {
      const pendingRequest = await createCorrectionRequest({
        subject: english._id,
        status: "pending_teacher",
        proposedScore: null,
        submittedByTeacher: null,
        submittedAt: null,
      });

      const response = await acceptRequest(pendingRequest._id, {
        note: "Attempted early acceptance.",
      });

      expect(response.statusCode).toBe(409);
    });

    test("cannot accept a request when its parent revision is no longer a draft", async () => {
      await ResultRevision.updateOne(
        { _id: revision._id },
        { $set: { status: "submitted" } },
      );

      const response = await acceptRequest(correctionRequest._id, {
        note: "Attempted acceptance after submission.",
      });

      expect(response.statusCode).toBe(409);
    });

    test("cannot accept a request when the parent revision is inactive", async () => {
      await ResultRevision.updateOne(
        { _id: revision._id },
        { $set: { isActive: false } },
      );

      const response = await acceptRequest(correctionRequest._id, {
        note: "Attempted acceptance of an inactive revision.",
      });

      expect(response.statusCode).toBe(409);
    });

    test("does not merge an invalid proposed score", async () => {
      // Bypass Mongoose validation deliberately so the controller
      // receives an invalid value and must reject it itself.
      await SubjectResultCorrectionRequest.collection.updateOne(
        { _id: correctionRequest._id },
        { $set: { "proposedScore.ca1": 21 } },
      );

      const response = await acceptRequest(correctionRequest._id, {
        note: "Attempted acceptance of an invalid score.",
      });

      expect(response.statusCode).toBe(400);

      const savedRevision = await ResultRevision.findById(revision._id).lean();

      const mathematicsResult = savedRevision.proposedData.subjectResults.find(
        (item) => item.subjectId === mathematics._id.toString(),
      );

      expect(mathematicsResult.ca1).toBe(15);
    });

    test("cannot accept a request if the published result changed after the revision snapshot", async () => {
      await Result.updateOne(
        { _id: result._id },
        { $set: { "subjectResults.0.ca1": 16 } },
      );

      const response = await acceptRequest(correctionRequest._id, {
        note: "Attempted acceptance against a stale result.",
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ---------------------------------------------------------
  // RETURN CORRECTION REQUEST
  // ---------------------------------------------------------

  describe("PATCH /api/v1/subject-result-correction-requests/:id/return", () => {
    const returnRequest = (id = correctionRequest._id, body = {}) =>
      request(app)
        .patch(`${requestUrl(id)}/return`)
        .set(auth())
        .send(body);

    test("returns a correction request with an explanation", async () => {
      const reason =
        "Please verify the examination script and correct the proposed score.";

      const response = await returnRequest(correctionRequest._id, {
        reason,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.correctionRequest.status).toBe("returned");

      const savedRequest = await SubjectResultCorrectionRequest.findById(
        correctionRequest._id,
      );

      expect(savedRequest.status).toBe("returned");
      expect(savedRequest.adminReviewNote).toBe(reason);

      expect(savedRequest.reviewedBy.toString()).toBe(admin._id.toString());

      expect(savedRequest.events[0].action).toBe("returned");
    });

    test("does not merge the proposed score when a request is returned", async () => {
      const response = await returnRequest(correctionRequest._id, {
        reason: "Please verify the examination score.",
      });

      expect(response.statusCode).toBe(200);

      const savedRevision = await ResultRevision.findById(revision._id).lean();

      const mathematicsResult = savedRevision.proposedData.subjectResults.find(
        (item) => item.subjectId === mathematics._id.toString(),
      );

      expect(mathematicsResult.ca1).toBe(15);
      expect(mathematicsResult.ca2).toBe(8);
      expect(mathematicsResult.exam).toBe(60);

      expect(savedRevision.status).toBe("draft");
    });

    test("records an administrator audit log after returning", async () => {
      const response = await returnRequest(correctionRequest._id, {
        reason: "Please verify the examination score.",
      });

      expect(response.statusCode).toBe(200);

      const auditLog = await AuditLog.findOne({
        user: admin._id,
        action: "RETURN_SUBJECT_RESULT_CORRECTION_REQUEST",
        module: "SUBJECT_RESULT_CORRECTIONS",
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog.description).toContain(correctionRequest._id.toString());
    });

    test("requires a return explanation", async () => {
      const response = await returnRequest(correctionRequest._id, {});

      expect(response.statusCode).toBe(400);
    });

    test("rejects a return explanation shorter than five characters", async () => {
      const response = await returnRequest(correctionRequest._id, {
        reason: "No",
      });

      expect(response.statusCode).toBe(400);
    });

    test("rejects a return explanation longer than 2000 characters", async () => {
      const response = await returnRequest(correctionRequest._id, {
        reason: "x".repeat(2001),
      });

      expect(response.statusCode).toBe(400);
    });

    test("requires results.approve permission", async () => {
      const response = await request(app)
        .patch(`${requestUrl(correctionRequest._id)}/return`)
        .set(auth(viewOnlyAdmin))
        .send({
          reason: "Please verify the examination score.",
        });

      expect(response.statusCode).toBe(403);

      const savedRequest = await SubjectResultCorrectionRequest.findById(
        correctionRequest._id,
      );

      expect(savedRequest.status).toBe("submitted");
    });

    test("rejects invalid request IDs", async () => {
      const response = await returnRequest("invalid-id", {
        reason: "Please verify the examination score.",
      });

      expect(response.statusCode).toBe(400);
    });

    test("cannot return a request that is still pending teacher submission", async () => {
      const pendingRequest = await createCorrectionRequest({
        subject: english._id,
        status: "pending_teacher",
        proposedScore: null,
        submittedByTeacher: null,
        submittedAt: null,
      });

      const response = await returnRequest(pendingRequest._id, {
        reason: "Please submit the correction first.",
      });

      expect(response.statusCode).toBe(409);
    });

    test("cannot return a request when its parent revision is no longer open", async () => {
      await ResultRevision.updateOne(
        { _id: revision._id },
        { $set: { status: "approved" } },
      );

      const response = await returnRequest(correctionRequest._id, {
        reason: "Please verify the examination score.",
      });

      expect(response.statusCode).toBe(409);
    });
  });
});
