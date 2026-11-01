const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");

const Admin = require("../models/Admin");
const Teacher = require("../models/Teacher");
const SchoolClass = require("../models/SchoolClass");
const Subject = require("../models/Subject");
const ClassSubjectAllocation = require("../models/ClassSubjectAllocation");
const AcademicSession = require("../models/AcademicSession");
const TeacherAssignment = require("../models/TeacherAssignment");
const SubjectResultResponsibility = require("../models/SubjectResultResponsibility");
const SubjectResultSubmission = require("../models/SubjectResultSubmission");
const Result = require("../models/Result");
const AuditLog = require("../models/AuditLog");

describe("ADMIN SUBJECT RESULT REVIEW API", () => {
  let admin;
  let viewOnlyAdmin;
  let teacher;
  let allocation;
  let academicSession;
  let assignment;
  let responsibility;
  let secondTermResponsibility;
  const createAdmin = async (overrides = {}) => {
    const count = await Admin.countDocuments();

    return Admin.create({
      fullName: `Review Admin ${count + 1}`,
      email: `review-admin-${count + 1}@test.com`,
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

  const reviewUrl = (id) => `/api/v1/subject-result-submissions/${id}`;

  const createSubmission = async (status = "submitted", overrides = {}) =>
    SubjectResultSubmission.create({
      allocation: allocation._id,
      academicSession: academicSession._id,
      term: "first",
      responsibility: responsibility._id,
      studentResults: [],
      status,
      createdByTeacher: teacher._id,
      submittedByTeacher: status === "submitted" ? teacher._id : null,
      submittedAt: status === "submitted" ? new Date() : null,
      ...overrides,
    });

  beforeEach(async () => {
    admin = await createAdmin({
      fullName: "Review Administrator",
      email: "review-admin@test.com",
    });

    viewOnlyAdmin = await createAdmin({
      fullName: "View Only Administrator",
      email: "view-only@test.com",
      permissions: ["results.view"],
    });

    teacher = await Teacher.create({
      fullName: "Subject Teacher",
      email: "subject-teacher@test.com",
      password: "Password123!",
      mustChangePassword: false,
      isActive: true,
    });

    const schoolClass = await SchoolClass.create({
      name: "JSS1",
      level: "junior",
      hasDepartments: false,
      isActive: true,
    });

    const subject = await Subject.create({
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
        { key: "first", name: "First Term", isActive: true },
        { key: "second", name: "Second Term", isActive: false },
        { key: "third", name: "Third Term", isActive: false },
      ],
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
    secondTermResponsibility = await SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: academicSession._id,
      term: "second",
      teacherAssignment: assignment._id,
    });
  });

  describe("GET /api/v1/subject-result-submissions", () => {
    test("lists submissions with populated class, subject, session and teacher details", async () => {
      await createSubmission();

      const response = await request(app)
        .get("/api/v1/subject-result-submissions")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.submissions).toHaveLength(1);

      const item = response.body.submissions[0];

      expect(item.allocation.schoolClass.name).toBe("JSS1");
      expect(item.allocation.subject.name).toBe("Mathematics");
      expect(item.academicSession.name).toBe("2026/2027");
      expect(item.responsibility.teacherAssignment.teacher.fullName).toBe(
        "Subject Teacher",
      );

      expect(response.body.pagination.total).toBe(1);
    });

    test("filters submissions by status, session and term", async () => {
      await createSubmission("submitted");
      await createSubmission("draft", {
        term: "second",
        responsibility: secondTermResponsibility._id,
      });

      const response = await request(app)
        .get("/api/v1/subject-result-submissions")
        .query({
          status: "submitted",
          academicSessionId: academicSession._id.toString(),
          term: "first",
        })
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.submissions).toHaveLength(1);
      expect(response.body.submissions[0].status).toBe("submitted");
      expect(response.body.pagination.total).toBe(1);
    });

    test("rejects invalid status, term and academic session ID", async () => {
      const invalidStatus = await request(app)
        .get("/api/v1/subject-result-submissions")
        .query({ status: "waiting" })
        .set(auth());

      const invalidTerm = await request(app)
        .get("/api/v1/subject-result-submissions")
        .query({ term: "fourth" })
        .set(auth());

      const invalidSession = await request(app)
        .get("/api/v1/subject-result-submissions")
        .query({ academicSessionId: "invalid-id" })
        .set(auth());

      expect(invalidStatus.statusCode).toBe(400);
      expect(invalidTerm.statusCode).toBe(400);
      expect(invalidSession.statusCode).toBe(400);
    });

    test("requires authentication and results.view permission", async () => {
      const unauthenticated = await request(app).get(
        "/api/v1/subject-result-submissions",
      );

      const viewOnly = await request(app)
        .get("/api/v1/subject-result-submissions")
        .set(auth(viewOnlyAdmin));

      expect(unauthenticated.statusCode).toBe(401);
      expect(viewOnly.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/subject-result-submissions/:id", () => {
    test("returns one populated submission", async () => {
      const submission = await createSubmission();

      const response = await request(app)
        .get(reviewUrl(submission._id))
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.submission._id).toBe(submission._id.toString());
      expect(response.body.submission.allocation.subject.name).toBe(
        "Mathematics",
      );
    });

    test("rejects invalid IDs and returns 404 for missing submissions", async () => {
      const invalid = await request(app)
        .get(reviewUrl("invalid-id"))
        .set(auth());

      const missing = await request(app)
        .get(reviewUrl("64b000000000000000000001"))
        .set(auth());

      expect(invalid.statusCode).toBe(400);
      expect(missing.statusCode).toBe(404);
    });
  });

  describe("PATCH /api/v1/subject-result-submissions/:id/approve", () => {
    test("approves a submitted sheet and records the administrator", async () => {
      const submission = await createSubmission();
      const previousVersion = responsibility.writeVersion;

      const response = await request(app)
        .patch(`${reviewUrl(submission._id)}/approve`)
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.submission.status).toBe("approved");
      expect(response.body.submission.approvedBy._id).toBe(
        admin._id.toString(),
      );
      expect(response.body.submission.approvedAt).toBeTruthy();

      const savedSubmission = await SubjectResultSubmission.findById(
        submission._id,
      );

      const savedResponsibility = await SubjectResultResponsibility.findById(
        responsibility._id,
      );

      expect(savedSubmission.status).toBe("approved");
      expect(savedResponsibility.writeVersion).toBe(previousVersion + 1);

      const auditLog = await AuditLog.findOne({
        user: admin._id,
        action: "APPROVE_SUBJECT_RESULT_SUBMISSION",
        module: "SUBJECT_RESULTS",
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog.description).toContain("Review Administrator");
      expect(auditLog.description).toContain("Mathematics");

      // Subject-sheet approval must not create an official student result.
      expect(await Result.countDocuments()).toBe(0);
    });

    test("does not approve drafts or approve the same submission twice", async () => {
      const draft = await createSubmission("draft");

      const draftResponse = await request(app)
        .patch(`${reviewUrl(draft._id)}/approve`)
        .set(auth());

      expect(draftResponse.statusCode).toBe(409);

      const submitted = await createSubmission("submitted", {
        term: "second",
        responsibility: secondTermResponsibility._id,
      });

      const firstApproval = await request(app)
        .patch(`${reviewUrl(submitted._id)}/approve`)
        .set(auth());

      const secondApproval = await request(app)
        .patch(`${reviewUrl(submitted._id)}/approve`)
        .set(auth());

      expect(firstApproval.statusCode).toBe(200);
      expect(secondApproval.statusCode).toBe(409);
    });

    test("requires results.approve permission", async () => {
      const submission = await createSubmission();

      const response = await request(app)
        .patch(`${reviewUrl(submission._id)}/approve`)
        .set(auth(viewOnlyAdmin));

      expect(response.statusCode).toBe(403);

      const saved = await SubjectResultSubmission.findById(submission._id);
      expect(saved.status).toBe("submitted");
    });
  });

  describe("PATCH /api/v1/subject-result-submissions/:id/reject", () => {
    test("requires a non-empty rejection reason", async () => {
      const submission = await createSubmission();

      const missingReason = await request(app)
        .patch(`${reviewUrl(submission._id)}/reject`)
        .set(auth())
        .send({});

      const blankReason = await request(app)
        .patch(`${reviewUrl(submission._id)}/reject`)
        .set(auth())
        .send({ reason: "   " });

      expect(missingReason.statusCode).toBe(400);
      expect(blankReason.statusCode).toBe(400);

      const saved = await SubjectResultSubmission.findById(submission._id);
      expect(saved.status).toBe("submitted");
    });

    test("rejects a reason longer than 1000 characters", async () => {
      const submission = await createSubmission();

      const response = await request(app)
        .patch(`${reviewUrl(submission._id)}/reject`)
        .set(auth())
        .send({ reason: "x".repeat(1001) });

      expect(response.statusCode).toBe(400);

      const saved = await SubjectResultSubmission.findById(submission._id);
      expect(saved.status).toBe("submitted");
    });

    test("rejects a submitted sheet and stores rejection details and history", async () => {
      const submission = await createSubmission();
      const reason = "Please correct the examination scores.";

      const response = await request(app)
        .patch(`${reviewUrl(submission._id)}/reject`)
        .set(auth())
        .send({ reason });

      expect(response.statusCode).toBe(200);
      expect(response.body.submission.status).toBe("rejected");
      expect(response.body.submission.rejectionReason).toBe(reason);
      expect(response.body.submission.rejectedBy._id).toBe(
        admin._id.toString(),
      );
      expect(response.body.submission.rejectionHistory).toHaveLength(1);
      expect(response.body.submission.rejectionHistory[0].reason).toBe(reason);

      const savedResponsibility = await SubjectResultResponsibility.findById(
        responsibility._id,
      );

      expect(savedResponsibility.writeVersion).toBe(1);
      expect(await Result.countDocuments()).toBe(0);

      const auditLog = await AuditLog.findOne({
        user: admin._id,
        action: "REJECT_SUBJECT_RESULT_SUBMISSION",
        module: "SUBJECT_RESULTS",
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog.description).toContain(reason);
    });

    test("preserves earlier rejection history after resubmission and another rejection", async () => {
      const submission = await createSubmission();

      const firstReason = "Correct the CA1 scores.";

      const firstResponse = await request(app)
        .patch(`${reviewUrl(submission._id)}/reject`)
        .set(auth())
        .send({ reason: firstReason });

      expect(firstResponse.statusCode).toBe(200);

      const saved = await SubjectResultSubmission.findById(submission._id);

      // Simulate the teacher correcting and resubmitting the sheet.
      saved.status = "submitted";
      saved.submittedAt = new Date();
      saved.submittedByTeacher = teacher._id;
      saved.rejectionReason = "";
      saved.rejectedBy = null;
      saved.rejectedAt = null;

      await saved.save();

      const secondReason = "Correct the CA2 scores as well.";

      const secondResponse = await request(app)
        .patch(`${reviewUrl(submission._id)}/reject`)
        .set(auth())
        .send({ reason: secondReason });

      expect(secondResponse.statusCode).toBe(200);
      expect(secondResponse.body.submission.status).toBe("rejected");
      expect(
        secondResponse.body.submission.rejectionHistory.map(
          (entry) => entry.reason,
        ),
      ).toEqual([firstReason, secondReason]);
    });

    test("does not reject drafts or already rejected submissions", async () => {
      const draft = await createSubmission("draft");
      const rejected = await createSubmission("rejected", {
        term: "second",
        responsibility: secondTermResponsibility._id,
      });

      const draftResponse = await request(app)
        .patch(`${reviewUrl(draft._id)}/reject`)
        .set(auth())
        .send({ reason: "Needs correction." });

      const rejectedResponse = await request(app)
        .patch(`${reviewUrl(rejected._id)}/reject`)
        .set(auth())
        .send({ reason: "Needs another correction." });

      expect(draftResponse.statusCode).toBe(409);
      expect(rejectedResponse.statusCode).toBe(409);
    });

    test("requires results.approve permission", async () => {
      const submission = await createSubmission();

      const response = await request(app)
        .patch(`${reviewUrl(submission._id)}/reject`)
        .set(auth(viewOnlyAdmin))
        .send({ reason: "Correct the scores." });

      expect(response.statusCode).toBe(403);

      const saved = await SubjectResultSubmission.findById(submission._id);
      expect(saved.status).toBe("submitted");
    });
  });
});
