const request = require("supertest");

const app = require("../app");

const Admin = require("../models/Admin");
const Teacher = require("../models/Teacher");
const SchoolClass = require("../models/SchoolClass");
const Subject = require("../models/Subject");
const ClassSubjectAllocation = require("../models/ClassSubjectAllocation");
const AcademicSession = require("../models/AcademicSession");
const TeacherAssignment = require("../models/TeacherAssignment");
const SubjectResultResponsibility = require("../models/SubjectResultResponsibility");

const generateToken = require("../utils/generateToken");

describe("SUBJECT RESULT RESPONSIBILITY API", () => {
  let admin;
  let token;

  let teacher;
  let secondTeacher;
  let jss1;
  let mathematics;
  let english;
  let mathematicsAllocation;
  let englishAllocation;
  let session;
  let secondSession;
  let assignment;
  let secondTeacherAssignment;
  let englishAssignment;
  let differentSessionAssignment;

  const auth = () => ({
    Authorization: `Bearer ${token}`,
  });

  const createAssignment = async (overrides = {}) => {
    return TeacherAssignment.create({
      teacher: teacher._id,
      allocation: mathematicsAllocation._id,
      academicSession: session._id,
      assignedBy: admin._id,
      updatedBy: admin._id,
      ...overrides,
    });
  };

  const createResponsibility = async (overrides = {}) => {
    return SubjectResultResponsibility.create({
      allocation: mathematicsAllocation._id,
      academicSession: session._id,
      term: "first",
      teacherAssignment: assignment._id,
      assignedBy: admin._id,
      updatedBy: admin._id,
      ...overrides,
    });
  };

  const responsibilityUrl = (allocationId = mathematicsAllocation._id) =>
    `/api/v1/teacher-assignments/result-responsibilities/${allocationId}`;

  const designationPayload = (overrides = {}) => ({
    academicSession: session._id.toString(),
    term: "first",
    teacherAssignment: assignment._id.toString(),
    ...overrides,
  });

  beforeEach(async () => {
    admin = await Admin.create({
      fullName: "Responsibility Administrator",
      email: "responsibility-admin@test.com",
      password: "Password123!",
      role: "admin",
      permissions: ["teacher-assignments.view", "teacher-assignments.update"],
      isActive: true,
    });

    token = generateToken(admin);

    jss1 = await SchoolClass.create({
      name: "JSS1",
      level: "junior",
      hasDepartments: false,
      isActive: true,
    });

    [mathematics, english] = await Subject.create([
      {
        name: "Mathematics",
        code: "MTH",
        isActive: true,
      },
      {
        name: "English Language",
        code: "ENG",
        isActive: true,
      },
    ]);

    teacher = await Teacher.create({
      fullName: "John Teacher",
      email: "john-responsibility@test.com",
      password: "Password123!",
      isActive: true,
    });

    secondTeacher = await Teacher.create({
      fullName: "Jane Teacher",
      email: "jane-responsibility@test.com",
      password: "Password123!",
      isActive: true,
    });

    mathematicsAllocation = await ClassSubjectAllocation.create({
      schoolClass: jss1._id,
      department: null,
      subject: mathematics._id,
      isActive: true,
      createdBy: admin._id,
      updatedBy: admin._id,
    });

    englishAllocation = await ClassSubjectAllocation.create({
      schoolClass: jss1._id,
      department: null,
      subject: english._id,
      isActive: true,
      createdBy: admin._id,
      updatedBy: admin._id,
    });

    session = await AcademicSession.create({
      name: "2026/2027",
      terms: [
        { key: "first", name: "First Term", isActive: true },
        { key: "second", name: "Second Term", isActive: false },
        { key: "third", name: "Third Term", isActive: false },
      ],
      isActive: true,
    });

    secondSession = await AcademicSession.create({
      name: "2027/2028",
      terms: [
        { key: "first", name: "First Term", isActive: true },
        { key: "second", name: "Second Term", isActive: false },
        { key: "third", name: "Third Term", isActive: false },
      ],
      isActive: true,
    });

    assignment = await createAssignment();

    secondTeacherAssignment = await createAssignment({
      teacher: secondTeacher._id,
    });

    englishAssignment = await createAssignment({
      allocation: englishAllocation._id,
    });

    differentSessionAssignment = await createAssignment({
      academicSession: secondSession._id,
    });
  });

  /*
  |--------------------------------------------------------------------------
  | GET SUBJECT RESULT RESPONSIBILITIES
  |--------------------------------------------------------------------------
  */

  describe("GET /api/v1/teacher-assignments/result-responsibilities", () => {
    test("returns designated teachers for the selected session and term", async () => {
      await createResponsibility();

      await createResponsibility({
        allocation: englishAllocation._id,
        teacherAssignment: englishAssignment._id,
      });

      // A second-term responsibility should not appear in first-term results.
      await createResponsibility({
        term: "second",
        teacherAssignment: secondTeacherAssignment._id,
      });

      const response = await request(app)
        .get(
          `/api/v1/teacher-assignments/result-responsibilities?academicSessionId=${session._id}&term=first`,
        )
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.term).toBe("first");
      expect(response.body.totalResponsibilities).toBe(2);
      expect(response.body.responsibilities).toHaveLength(2);

      const mathematicsResponsibility = response.body.responsibilities.find(
        (item) => item.allocation.subject.name === "Mathematics",
      );

      expect(mathematicsResponsibility).toBeTruthy();

      expect(mathematicsResponsibility.teacherAssignment.teacher.fullName).toBe(
        "John Teacher",
      );
    });

    test("returns an empty list when no responsibilities exist", async () => {
      const response = await request(app)
        .get(
          `/api/v1/teacher-assignments/result-responsibilities?academicSessionId=${session._id}&term=first`,
        )
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.responsibilities).toHaveLength(0);
      expect(response.body.totalResponsibilities).toBe(0);
    });

    test("requires an academic session ID", async () => {
      const response = await request(app)
        .get("/api/v1/teacher-assignments/result-responsibilities?term=first")
        .set(auth());

      expect(response.statusCode).toBe(400);
    });

    test("rejects an invalid academic session ID", async () => {
      const response = await request(app)
        .get(
          "/api/v1/teacher-assignments/result-responsibilities?academicSessionId=invalid&term=first",
        )
        .set(auth());

      expect(response.statusCode).toBe(400);
    });

    test("requires a valid term", async () => {
      const response = await request(app)
        .get(
          `/api/v1/teacher-assignments/result-responsibilities?academicSessionId=${session._id}&term=fourth`,
        )
        .set(auth());

      expect(response.statusCode).toBe(400);
    });

    test("rejects a nonexistent academic session", async () => {
      const response = await request(app)
        .get(
          "/api/v1/teacher-assignments/result-responsibilities?academicSessionId=68c123456789abcdef123456&term=first",
        )
        .set(auth());

      expect(response.statusCode).toBe(404);
    });

    test("rejects an admin without view permission", async () => {
      const restrictedAdmin = await Admin.create({
        fullName: "Restricted Viewer",
        email: "restricted-responsibility-viewer@test.com",
        password: "Password123!",
        role: "admin",
        permissions: [],
        isActive: true,
      });

      const restrictedToken = generateToken(restrictedAdmin);

      const response = await request(app)
        .get(
          `/api/v1/teacher-assignments/result-responsibilities?academicSessionId=${session._id}&term=first`,
        )
        .set("Authorization", `Bearer ${restrictedToken}`);

      expect(response.statusCode).toBe(403);
    });

    test("rejects unauthenticated requests", async () => {
      const response = await request(app).get(
        `/api/v1/teacher-assignments/result-responsibilities?academicSessionId=${session._id}&term=first`,
      );

      expect(response.statusCode).toBe(401);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | DESIGNATE SUBJECT RESULT TEACHER
  |--------------------------------------------------------------------------
  */

  describe("PUT /api/v1/teacher-assignments/result-responsibilities/:allocationId", () => {
    test("designates a teacher for a subject allocation", async () => {
      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(designationPayload());

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.responsibility.allocation.subject.name).toBe(
        "Mathematics",
      );

      expect(
        response.body.responsibility.teacherAssignment.teacher.fullName,
      ).toBe("John Teacher");

      expect(response.body.responsibility.term).toBe("first");

      expect(await SubjectResultResponsibility.countDocuments()).toBe(1);
    });

    test("allows different teachers to own different terms", async () => {
      const firstTermResponse = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(designationPayload());

      const secondTermResponse = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(
          designationPayload({
            term: "second",
            teacherAssignment: secondTeacherAssignment._id.toString(),
          }),
        );

      expect(firstTermResponse.statusCode).toBe(200);
      expect(secondTermResponse.statusCode).toBe(200);

      expect(
        await SubjectResultResponsibility.countDocuments({
          allocation: mathematicsAllocation._id,
          academicSession: session._id,
        }),
      ).toBe(2);
    });

    test("does not create duplicate records when the same teacher is selected again", async () => {
      await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(designationPayload());

      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(designationPayload());

      expect(response.statusCode).toBe(200);

      expect(await SubjectResultResponsibility.countDocuments()).toBe(1);

      const responsibility = await SubjectResultResponsibility.findOne({
        allocation: mathematicsAllocation._id,
        academicSession: session._id,
        term: "first",
      });

      expect(responsibility.assignmentHistory).toHaveLength(0);
    });

    test("reassigns the subject result owner and preserves the previous assignment in history", async () => {
      await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(designationPayload());

      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(
          designationPayload({
            teacherAssignment: secondTeacherAssignment._id.toString(),
            reason: "Change of subject teacher",
          }),
        );

      expect(response.statusCode).toBe(200);

      expect(
        response.body.responsibility.teacherAssignment.teacher.fullName,
      ).toBe("Jane Teacher");

      const responsibility = await SubjectResultResponsibility.findOne({
        allocation: mathematicsAllocation._id,
        academicSession: session._id,
        term: "first",
      });

      expect(responsibility.assignmentHistory).toHaveLength(1);

      expect(
        responsibility.assignmentHistory[0].teacherAssignment.toString(),
      ).toBe(assignment._id.toString());

      expect(responsibility.assignmentHistory[0].reason).toBe(
        "Change of subject teacher",
      );

      expect(responsibility.assignmentHistory[0].changedBy.toString()).toBe(
        admin._id.toString(),
      );
    });

    test("rejects an invalid allocation ID", async () => {
      const response = await request(app)
        .put(responsibilityUrl("invalid-allocation-id"))
        .set(auth())
        .send(designationPayload());

      expect(response.statusCode).toBe(400);
    });

    test("rejects an invalid academic session ID", async () => {
      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(
          designationPayload({
            academicSession: "invalid-session-id",
          }),
        );

      expect(response.statusCode).toBe(400);
    });

    test("rejects an invalid teacher assignment ID", async () => {
      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(
          designationPayload({
            teacherAssignment: "invalid-assignment-id",
          }),
        );

      expect(response.statusCode).toBe(400);
    });

    test("rejects an invalid term", async () => {
      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(
          designationPayload({
            term: "fourth",
          }),
        );

      expect(response.statusCode).toBe(400);
    });

    test("rejects a missing teacher assignment", async () => {
      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send({
          academicSession: session._id.toString(),
          term: "first",
        });

      expect(response.statusCode).toBe(400);
    });

    test("rejects a nonexistent subject allocation", async () => {
      const response = await request(app)
        .put(responsibilityUrl("68c123456789abcdef123456"))
        .set(auth())
        .send(designationPayload());

      expect(response.statusCode).toBe(404);
    });

    test("rejects a nonexistent academic session", async () => {
      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(
          designationPayload({
            academicSession: "68c123456789abcdef123456",
          }),
        );

      expect(response.statusCode).toBe(404);
    });

    test("rejects a nonexistent teacher assignment", async () => {
      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(
          designationPayload({
            teacherAssignment: "68c123456789abcdef123456",
          }),
        );

      expect(response.statusCode).toBe(404);
    });

    test("rejects a teacher assignment belonging to another allocation", async () => {
      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(
          designationPayload({
            teacherAssignment: englishAssignment._id.toString(),
          }),
        );

      expect(response.statusCode).toBe(400);
    });

    test("rejects a teacher assignment belonging to another academic session", async () => {
      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(
          designationPayload({
            teacherAssignment: differentSessionAssignment._id.toString(),
          }),
        );

      expect(response.statusCode).toBe(400);
    });

    test("rejects an inactive teacher assignment", async () => {
      const inactiveAssignment = await createAssignment({
        teacher: secondTeacher._id,
        allocation: englishAllocation._id,
        isActive: false,
      });

      const response = await request(app)
        .put(responsibilityUrl(englishAllocation._id))
        .set(auth())
        .send(
          designationPayload({
            teacherAssignment: inactiveAssignment._id.toString(),
          }),
        );

      expect(response.statusCode).toBe(400);
    });

    test("rejects an assignment belonging to an inactive teacher", async () => {
      secondTeacher.isActive = false;
      await secondTeacher.save();

      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(
          designationPayload({
            teacherAssignment: secondTeacherAssignment._id.toString(),
          }),
        );

      expect(response.statusCode).toBe(400);
    });

    test("rejects an inactive subject allocation", async () => {
      mathematicsAllocation.isActive = false;
      await mathematicsAllocation.save();

      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(designationPayload());

      expect(response.statusCode).toBe(400);
    });

    test("rejects a term that does not exist in the academic session", async () => {
      session.terms = [
        { key: "first", name: "First Term", isActive: true },
        { key: "second", name: "Second Term", isActive: false },
      ];

      await session.save();

      const response = await request(app)
        .put(responsibilityUrl())
        .set(auth())
        .send(
          designationPayload({
            term: "third",
          }),
        );

      expect(response.statusCode).toBe(400);
    });

    test("rejects an admin without update permission", async () => {
      const restrictedAdmin = await Admin.create({
        fullName: "Restricted Updater",
        email: "restricted-responsibility-updater@test.com",
        password: "Password123!",
        role: "admin",
        permissions: ["teacher-assignments.view"],
        isActive: true,
      });

      const restrictedToken = generateToken(restrictedAdmin);

      const response = await request(app)
        .put(responsibilityUrl())
        .set("Authorization", `Bearer ${restrictedToken}`)
        .send(designationPayload());

      expect(response.statusCode).toBe(403);
    });

    test("rejects unauthenticated designation requests", async () => {
      const response = await request(app)
        .put(responsibilityUrl())
        .send(designationPayload());

      expect(response.statusCode).toBe(401);
    });
  });
});
