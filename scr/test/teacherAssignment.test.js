const request = require("supertest");

const app = require("../app");

const Admin = require("../models/Admin");
const Teacher = require("../models/Teacher");
const SchoolClass = require("../models/SchoolClass");
const Subject = require("../models/Subject");
const ClassSubjectAllocation = require("../models/ClassSubjectAllocation");
const AcademicSession = require("../models/AcademicSession");
const TeacherAssignment = require("../models/TeacherAssignment");

const generateToken = require("../utils/generateToken");
const SubjectResultResponsibility = require("../models/SubjectResultResponsibility");
const SubjectResultSubmission = require("../models/SubjectResultSubmission");

describe("TEACHER ASSIGNMENT API", () => {
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

  const auth = () => ({
    Authorization: `Bearer ${token}`,
  });

  const designateResultTeacher = async ({
    allocationId = mathematicsAllocation._id,
    academicSession = session._id,
    term = "first",
    teacherAssignment,
    reason = "",
  } = {}) => {
    return request(app)
      .put(
        `/api/v1/teacher-assignments/result-responsibilities/${allocationId}`,
      )
      .set(auth())
      .send({
        academicSession,
        term,
        teacherAssignment,
        reason,
      });
  };

  const createTeacher = async (overrides = {}) => {
    const count = await Teacher.countDocuments();

    return Teacher.create({
      fullName: `Test Teacher ${count + 1}`,
      email: `teacher${count + 1}@test.com`,
      password: "Password123!",
      ...overrides,
    });
  };

  const createAllocation = async (overrides = {}) => {
    const count = await ClassSubjectAllocation.countDocuments();

    const subject =
      overrides.subject || (count % 2 === 0 ? mathematics : english);

    return ClassSubjectAllocation.create({
      schoolClass: jss1._id,
      subject,
      department: null,
      createdBy: admin._id,
      updatedBy: admin._id,
      ...overrides,
    });
  };

  const createSession = async (name) => {
    return AcademicSession.create({
      name,
      terms: [
        { key: "first", name: "First Term", isActive: true },
        { key: "second", name: "Second Term", isActive: false },
        { key: "third", name: "Third Term", isActive: false },
      ],
      isActive: true,
    });
  };

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

  beforeEach(async () => {
    admin = await Admin.create({
      fullName: "Assignment Administrator",
      email: "assignment-admin@test.com",
      password: "Password123!",
      role: "admin",
      permissions: [
        "teacher-assignments.view",
        "teacher-assignments.create",
        "teacher-assignments.update",
      ],
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

    teacher = await createTeacher({
      fullName: "John Teacher",
      email: "john@test.com",
    });

    secondTeacher = await createTeacher({
      fullName: "Jane Teacher",
      email: "jane@test.com",
    });

    mathematicsAllocation = await createAllocation({
      subject: mathematics._id,
    });

    englishAllocation = await createAllocation({
      subject: english._id,
    });

    session = await createSession("2026/2027");
    secondSession = await createSession("2025/2026");
  });

  /*
  |--------------------------------------------------------------------------
  | ASSIGNMENT OPTIONS
  |--------------------------------------------------------------------------
  */

  describe("GET /api/v1/teacher-assignments/options", () => {
    test("returns active teachers, sessions and allocations", async () => {
      const response = await request(app)
        .get("/api/v1/teacher-assignments/options")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.options.teachers).toHaveLength(2);
      expect(response.body.options.academicSessions).toHaveLength(2);
      expect(response.body.options.allocations).toHaveLength(2);
    });

    test("does not return inactive teachers", async () => {
      await createTeacher({
        fullName: "Inactive Teacher",
        email: "inactive@test.com",
        isActive: false,
      });

      const response = await request(app)
        .get("/api/v1/teacher-assignments/options")
        .set(auth());

      expect(response.statusCode).toBe(200);

      expect(
        response.body.options.teachers.some(
          (item) => item.email === "inactive@test.com",
        ),
      ).toBe(false);
    });

    test("does not return inactive subject allocations", async () => {
      await ClassSubjectAllocation.findOneAndUpdate(
        {
          schoolClass: jss1._id,
          subject: english._id,
          department: null,
        },
        {
          isActive: false,
        },
      );

      const response = await request(app)
        .get("/api/v1/teacher-assignments/options")
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(200);

      const allocationIds = response.body.options.allocations.map(
        (allocation) => allocation._id,
      );

      expect(allocationIds).not.toContain(englishAllocation._id.toString());
    });

    test("includes inactive academic sessions for historical assignments", async () => {
      await AcademicSession.findByIdAndUpdate(secondSession._id, {
        isActive: false,
      });

      const response = await request(app)
        .get("/api/v1/teacher-assignments/options")
        .set(auth());

      expect(response.statusCode).toBe(200);

      expect(response.body.options.academicSessions).toHaveLength(2);

      expect(
        response.body.options.academicSessions.some(
          (item) =>
            item._id === secondSession._id.toString() &&
            item.isActive === false,
        ),
      ).toBe(true);
    });

    test("rejects an admin without view permission", async () => {
      const restrictedAdmin = await Admin.create({
        fullName: "Restricted Admin",
        email: "restricted-options@test.com",
        password: "Password123!",
        role: "admin",
        permissions: [],
      });

      const restrictedToken = generateToken(restrictedAdmin);

      const response = await request(app)
        .get("/api/v1/teacher-assignments/options")
        .set("Authorization", `Bearer ${restrictedToken}`);

      expect(response.statusCode).toBe(403);
    });

    test("rejects unauthenticated requests", async () => {
      const response = await request(app).get(
        "/api/v1/teacher-assignments/options",
      );

      expect(response.statusCode).toBe(401);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | CREATE TEACHER ASSIGNMENT
  |--------------------------------------------------------------------------
  */

  describe("POST /api/v1/teacher-assignments", () => {
    test("assigns a teacher to a subject allocation and session", async () => {
      const response = await request(app)
        .post("/api/v1/teacher-assignments")
        .set(auth())
        .send({
          teacher: teacher._id.toString(),
          allocation: mathematicsAllocation._id.toString(),
          academicSession: session._id.toString(),
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.assignment.teacher.fullName).toBe("John Teacher");

      expect(response.body.assignment.allocation.subject.name).toBe(
        "Mathematics",
      );

      expect(response.body.assignment.allocation.schoolClass.name).toBe("JSS1");

      expect(response.body.assignment.academicSession.name).toBe("2026/2027");

      expect(response.body.assignment.isActive).toBe(true);

      expect(await TeacherAssignment.countDocuments()).toBe(1);
    });

    test("allows multiple teachers to share the same allocation and session", async () => {
      const firstResponse = await request(app)
        .post("/api/v1/teacher-assignments")
        .set(auth())
        .send({
          teacher: teacher._id.toString(),
          allocation: mathematicsAllocation._id.toString(),
          academicSession: session._id.toString(),
        });

      const secondResponse = await request(app)
        .post("/api/v1/teacher-assignments")
        .set(auth())
        .send({
          teacher: secondTeacher._id.toString(),
          allocation: mathematicsAllocation._id.toString(),
          academicSession: session._id.toString(),
        });

      expect(firstResponse.statusCode).toBe(201);
      expect(secondResponse.statusCode).toBe(201);

      expect(await TeacherAssignment.countDocuments()).toBe(2);
    });

    test("rejects assigning the same teacher to the same allocation twice in one session", async () => {
      await createAssignment();

      const response = await request(app)
        .post("/api/v1/teacher-assignments")
        .set(auth())
        .send({
          teacher: teacher._id.toString(),
          allocation: mathematicsAllocation._id.toString(),
          academicSession: session._id.toString(),
        });

      expect(response.statusCode).toBe(409);
      expect(await TeacherAssignment.countDocuments()).toBe(1);
    });

    test("allows the same teacher to teach a different allocation in the same session", async () => {
      await createAssignment();

      const response = await request(app)
        .post("/api/v1/teacher-assignments")
        .set(auth())
        .send({
          teacher: teacher._id.toString(),
          allocation: englishAllocation._id.toString(),
          academicSession: session._id.toString(),
        });

      expect(response.statusCode).toBe(201);
      expect(await TeacherAssignment.countDocuments()).toBe(2);
    });

    test("allows the same teacher and allocation in a different academic session", async () => {
      await createAssignment();

      const response = await request(app)
        .post("/api/v1/teacher-assignments")
        .set(auth())
        .send({
          teacher: teacher._id.toString(),
          allocation: mathematicsAllocation._id.toString(),
          academicSession: secondSession._id.toString(),
        });

      expect(response.statusCode).toBe(201);
      expect(await TeacherAssignment.countDocuments()).toBe(2);
    });

    test("rejects a missing teacher, allocation or session", async () => {
      const response = await request(app)
        .post("/api/v1/teacher-assignments")
        .set(auth())
        .send({
          teacher: teacher._id.toString(),
          allocation: mathematicsAllocation._id.toString(),
        });

      expect(response.statusCode).toBe(400);
    });

    test("rejects invalid ObjectId values", async () => {
      const response = await request(app)
        .post("/api/v1/teacher-assignments")
        .set(auth())
        .send({
          teacher: "invalid-teacher-id",
          allocation: mathematicsAllocation._id.toString(),
          academicSession: session._id.toString(),
        });

      expect(response.statusCode).toBe(400);
    });

    test("rejects a nonexistent teacher", async () => {
      const response = await request(app)
        .post("/api/v1/teacher-assignments")
        .set(auth())
        .send({
          teacher: "68c123456789abcdef123456",
          allocation: mathematicsAllocation._id.toString(),
          academicSession: session._id.toString(),
        });

      expect(response.statusCode).toBe(404);
    });

    test("rejects an inactive teacher", async () => {
      teacher.isActive = false;
      await teacher.save();

      const response = await request(app)
        .post("/api/v1/teacher-assignments")
        .set(auth())
        .send({
          teacher: teacher._id.toString(),
          allocation: mathematicsAllocation._id.toString(),
          academicSession: session._id.toString(),
        });

      expect(response.statusCode).toBe(404);
      expect(await TeacherAssignment.countDocuments()).toBe(0);
    });

    test("rejects an inactive subject allocation", async () => {
      mathematicsAllocation.isActive = false;
      await mathematicsAllocation.save();

      const response = await request(app)
        .post("/api/v1/teacher-assignments")
        .set(auth())
        .send({
          teacher: teacher._id.toString(),
          allocation: mathematicsAllocation._id.toString(),
          academicSession: session._id.toString(),
        });

      expect(response.statusCode).toBe(404);
      expect(await TeacherAssignment.countDocuments()).toBe(0);
    });

    test("rejects a nonexistent academic session", async () => {
      const response = await request(app)
        .post("/api/v1/teacher-assignments")
        .set(auth())
        .send({
          teacher: teacher._id.toString(),
          allocation: mathematicsAllocation._id.toString(),
          academicSession: "68c123456789abcdef123456",
        });

      expect(response.statusCode).toBe(404);
    });

    test("rejects an admin without create permission", async () => {
      const restrictedAdmin = await Admin.create({
        fullName: "Restricted Creator",
        email: "restricted-creator@test.com",
        password: "Password123!",
        role: "admin",
        permissions: [],
      });

      const restrictedToken = generateToken(restrictedAdmin);

      const response = await request(app)
        .post("/api/v1/teacher-assignments")
        .set("Authorization", `Bearer ${restrictedToken}`)
        .send({
          teacher: teacher._id.toString(),
          allocation: mathematicsAllocation._id.toString(),
          academicSession: session._id.toString(),
        });

      expect(response.statusCode).toBe(403);
    });

    test("rejects unauthenticated assignment creation", async () => {
      const response = await request(app)
        .post("/api/v1/teacher-assignments")
        .send({
          teacher: teacher._id.toString(),
          allocation: mathematicsAllocation._id.toString(),
          academicSession: session._id.toString(),
        });

      expect(response.statusCode).toBe(401);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | GET TEACHER ASSIGNMENTS
  |--------------------------------------------------------------------------
  */

  describe("GET /api/v1/teacher-assignments", () => {
    test("returns active assignments by default", async () => {
      await createAssignment();

      await createAssignment({
        allocation: englishAllocation._id,
        isActive: false,
      });

      const response = await request(app)
        .get("/api/v1/teacher-assignments")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.assignments).toHaveLength(1);

      expect(response.body.assignments[0].isActive).toBe(true);
    });

    test("returns inactive assignments when status=inactive", async () => {
      await createAssignment({
        isActive: false,
      });

      const response = await request(app)
        .get("/api/v1/teacher-assignments?status=inactive")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.assignments).toHaveLength(1);

      expect(response.body.assignments[0].isActive).toBe(false);
    });

    test("returns all assignments when status=all", async () => {
      await createAssignment();

      await createAssignment({
        allocation: englishAllocation._id,
        isActive: false,
      });

      const response = await request(app)
        .get("/api/v1/teacher-assignments?status=all")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.assignments).toHaveLength(2);
    });

    test("filters assignments by teacher", async () => {
      await createAssignment();

      await createAssignment({
        teacher: secondTeacher._id,
        allocation: englishAllocation._id,
      });

      const response = await request(app)
        .get(`/api/v1/teacher-assignments?teacherId=${teacher._id}`)
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.assignments).toHaveLength(1);

      expect(response.body.assignments[0].teacher._id).toBe(
        teacher._id.toString(),
      );
    });

    test("filters assignments by subject allocation", async () => {
      await createAssignment();

      await createAssignment({
        allocation: englishAllocation._id,
      });

      const response = await request(app)
        .get(
          `/api/v1/teacher-assignments?allocationId=${mathematicsAllocation._id}`,
        )
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.assignments).toHaveLength(1);
    });

    test("filters assignments by academic session", async () => {
      await createAssignment();

      await createAssignment({
        academicSession: secondSession._id,
      });

      const response = await request(app)
        .get(`/api/v1/teacher-assignments?academicSessionId=${session._id}`)
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.assignments).toHaveLength(1);

      expect(response.body.assignments[0].academicSession.name).toBe(
        "2026/2027",
      );
    });

    test("supports pagination", async () => {
      await createAssignment();

      await createAssignment({
        allocation: englishAllocation._id,
      });

      await createAssignment({
        teacher: secondTeacher._id,
      });

      const response = await request(app)
        .get("/api/v1/teacher-assignments?page=1&limit=2")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.assignments).toHaveLength(2);

      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.totalAssignments).toBe(3);
      expect(response.body.pagination.totalPages).toBe(2);
    });

    test("rejects invalid status filters", async () => {
      const response = await request(app)
        .get("/api/v1/teacher-assignments?status=deleted")
        .set(auth());

      expect(response.statusCode).toBe(400);
    });

    test("rejects invalid teacher filter IDs", async () => {
      const response = await request(app)
        .get("/api/v1/teacher-assignments?teacherId=invalid")
        .set(auth());

      expect(response.statusCode).toBe(400);
    });

    test("rejects an admin without view permission", async () => {
      const restrictedAdmin = await Admin.create({
        fullName: "Restricted Viewer",
        email: "restricted-viewer@test.com",
        password: "Password123!",
        role: "admin",
        permissions: [],
      });

      const restrictedToken = generateToken(restrictedAdmin);

      const response = await request(app)
        .get("/api/v1/teacher-assignments")
        .set("Authorization", `Bearer ${restrictedToken}`);

      expect(response.statusCode).toBe(403);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | ACTIVATE / DEACTIVATE ASSIGNMENT
  |--------------------------------------------------------------------------
  */

  describe("PATCH /api/v1/teacher-assignments/:id/status", () => {
    test("deactivates an assignment without deleting it", async () => {
      const assignment = await createAssignment();

      const response = await request(app)
        .patch(`/api/v1/teacher-assignments/${assignment._id}/status`)
        .set(auth())
        .send({
          isActive: false,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.assignment.isActive).toBe(false);

      const savedAssignment = await TeacherAssignment.findById(assignment._id);

      expect(savedAssignment).toBeTruthy();
      expect(savedAssignment.isActive).toBe(false);
    });

    test("reactivates an inactive assignment", async () => {
      const assignment = await createAssignment({
        isActive: false,
      });

      const response = await request(app)
        .patch(`/api/v1/teacher-assignments/${assignment._id}/status`)
        .set(auth())
        .send({
          isActive: true,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.assignment.isActive).toBe(true);
    });

    test("rejects reactivation when the teacher is inactive", async () => {
      const assignment = await createAssignment({
        isActive: false,
      });

      teacher.isActive = false;
      await teacher.save();

      const response = await request(app)
        .patch(`/api/v1/teacher-assignments/${assignment._id}/status`)
        .set(auth())
        .send({
          isActive: true,
        });

      expect(response.statusCode).toBe(400);

      const savedAssignment = await TeacherAssignment.findById(assignment._id);

      expect(savedAssignment.isActive).toBe(false);
    });

    test("rejects reactivation when the allocation is inactive", async () => {
      const assignment = await createAssignment({
        isActive: false,
      });

      mathematicsAllocation.isActive = false;
      await mathematicsAllocation.save();

      const response = await request(app)
        .patch(`/api/v1/teacher-assignments/${assignment._id}/status`)
        .set(auth())
        .send({
          isActive: true,
        });

      expect(response.statusCode).toBe(400);

      const savedAssignment = await TeacherAssignment.findById(assignment._id);

      expect(savedAssignment.isActive).toBe(false);
    });

    test("rejects non-boolean status values", async () => {
      const assignment = await createAssignment();

      const response = await request(app)
        .patch(`/api/v1/teacher-assignments/${assignment._id}/status`)
        .set(auth())
        .send({
          isActive: "false",
        });

      expect(response.statusCode).toBe(400);
    });

    test("returns 404 for a nonexistent assignment", async () => {
      const response = await request(app)
        .patch("/api/v1/teacher-assignments/68c123456789abcdef123456/status")
        .set(auth())
        .send({
          isActive: false,
        });

      expect(response.statusCode).toBe(404);
    });

    test("rejects an admin without update permission", async () => {
      const assignment = await createAssignment();

      const restrictedAdmin = await Admin.create({
        fullName: "Restricted Updater",
        email: "restricted-updater@test.com",
        password: "Password123!",
        role: "admin",
        permissions: [],
      });

      const restrictedToken = generateToken(restrictedAdmin);

      const response = await request(app)
        .patch(`/api/v1/teacher-assignments/${assignment._id}/status`)
        .set("Authorization", `Bearer ${restrictedToken}`)
        .send({
          isActive: false,
        });

      expect(response.statusCode).toBe(403);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | SUBJECT RESULT RESPONSIBILITY
  |--------------------------------------------------------------------------
  */

  describe("PUT /api/v1/teacher-assignments/result-responsibilities/:allocationId", () => {
    test("designates a teacher for a subject result for the first time", async () => {
      const assignment = await createAssignment();

      const response = await designateResultTeacher({
        teacherAssignment: assignment._id,
      });

      process.stdout.write(
        `DESIGNATION ERROR: ${JSON.stringify(response.body, null, 2)}\n`,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.responsibility.teacherAssignment._id).toBe(
        assignment._id.toString(),
      );

      expect(response.body.responsibility.term).toBe("first");
      expect(response.body.responsibility.writeVersion).toBe(0);

      expect(await SubjectResultResponsibility.countDocuments()).toBe(1);
    });

    test("reassigns result ownership and preserves the previous owner in history", async () => {
      const firstAssignment = await createAssignment();

      const firstResponse = await designateResultTeacher({
        teacherAssignment: firstAssignment._id,
      });

      expect(firstResponse.statusCode).toBe(200);

      const secondAssignment = await createAssignment({
        teacher: secondTeacher._id,
      });

      const response = await designateResultTeacher({
        teacherAssignment: secondAssignment._id,
        reason: "Teacher reassignment for this term",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const responsibility = response.body.responsibility;

      expect(responsibility.teacherAssignment._id).toBe(
        secondAssignment._id.toString(),
      );

      expect(responsibility.writeVersion).toBe(1);

      expect(responsibility.assignmentHistory).toHaveLength(1);

      expect(responsibility.assignmentHistory[0].teacherAssignment).toBe(
        firstAssignment._id.toString(),
      );

      expect(responsibility.assignmentHistory[0].changedBy).toBe(
        admin._id.toString(),
      );

      expect(responsibility.assignmentHistory[0].reason).toBe(
        "Teacher reassignment for this term",
      );
    });

    test("does not create duplicate history or increment writeVersion when the same teacher is selected again", async () => {
      const assignment = await createAssignment();

      const firstResponse = await designateResultTeacher({
        teacherAssignment: assignment._id,
      });

      expect(firstResponse.statusCode).toBe(200);

      const secondResponse = await designateResultTeacher({
        teacherAssignment: assignment._id,
      });

      expect(secondResponse.statusCode).toBe(200);

      expect(secondResponse.body.message).toBe(
        "This teacher is already designated for this subject result.",
      );

      expect(secondResponse.body.responsibility.writeVersion).toBe(0);

      expect(secondResponse.body.responsibility.assignmentHistory).toHaveLength(
        0,
      );

      expect(await SubjectResultResponsibility.countDocuments()).toBe(1);
    });

    test("preserves an existing draft when result ownership is reassigned", async () => {
      const firstAssignment = await createAssignment();

      const designationResponse = await designateResultTeacher({
        teacherAssignment: firstAssignment._id,
      });

      expect(designationResponse.statusCode).toBe(200);

      const responsibilityId = designationResponse.body.responsibility._id;

      const draft = await SubjectResultSubmission.create({
        allocation: mathematicsAllocation._id,
        academicSession: session._id,
        term: "first",
        responsibility: responsibilityId,
        studentResults: [],
        status: "draft",
        createdByTeacher: teacher._id,
      });

      const secondAssignment = await createAssignment({
        teacher: secondTeacher._id,
      });

      const response = await designateResultTeacher({
        teacherAssignment: secondAssignment._id,
        reason: "Reassignment before submission",
      });

      expect(response.statusCode).toBe(200);

      const savedDraft = await SubjectResultSubmission.findById(draft._id);

      expect(savedDraft).toBeTruthy();
      expect(savedDraft.status).toBe("draft");
      expect(savedDraft._id.toString()).toBe(draft._id.toString());

      const updatedResponsibility =
        await SubjectResultResponsibility.findById(responsibilityId);

      expect(updatedResponsibility.teacherAssignment.toString()).toBe(
        secondAssignment._id.toString(),
      );

      expect(updatedResponsibility.writeVersion).toBe(1);
    });

    test("blocks reassignment after a subject result has been submitted", async () => {
      const firstAssignment = await createAssignment();

      const designationResponse = await designateResultTeacher({
        teacherAssignment: firstAssignment._id,
      });

      expect(designationResponse.statusCode).toBe(200);

      const responsibilityId = designationResponse.body.responsibility._id;

      await SubjectResultSubmission.create({
        allocation: mathematicsAllocation._id,
        academicSession: session._id,
        term: "first",
        responsibility: responsibilityId,
        studentResults: [],
        status: "submitted",
        createdByTeacher: teacher._id,
        updatedByTeacher: teacher._id,
        submittedByTeacher: teacher._id,
        submittedAt: new Date(),
      });

      const secondAssignment = await createAssignment({
        teacher: secondTeacher._id,
      });

      const response = await designateResultTeacher({
        teacherAssignment: secondAssignment._id,
        reason: "Attempted reassignment after submission",
      });

      expect(response.statusCode).toBe(409);
      expect(response.body.success).toBe(false);

      expect(response.body.message).toMatch(/already been submitted/i);

      const responsibility =
        await SubjectResultResponsibility.findById(responsibilityId);

      expect(responsibility.teacherAssignment.toString()).toBe(
        firstAssignment._id.toString(),
      );

      expect(responsibility.writeVersion).toBe(0);
      expect(responsibility.assignmentHistory).toHaveLength(0);
    });

    test("allows separate responsibilities for different terms", async () => {
      const assignment = await createAssignment();

      const firstResponse = await designateResultTeacher({
        teacherAssignment: assignment._id,
        term: "first",
      });

      const secondResponse = await designateResultTeacher({
        teacherAssignment: assignment._id,
        term: "second",
      });

      expect(firstResponse.statusCode).toBe(200);
      expect(secondResponse.statusCode).toBe(200);

      expect(await SubjectResultResponsibility.countDocuments()).toBe(2);
    });

    test("rejects an invalid term", async () => {
      const assignment = await createAssignment();

      const response = await designateResultTeacher({
        teacherAssignment: assignment._id,
        term: "fourth",
      });

      expect(response.statusCode).toBe(400);
    });

    test("rejects an assignment belonging to a different allocation", async () => {
      const assignment = await createAssignment({
        allocation: englishAllocation._id,
      });

      const response = await designateResultTeacher({
        allocationId: mathematicsAllocation._id,
        teacherAssignment: assignment._id,
      });

      expect(response.statusCode).toBe(400);
    });

    test("rejects an admin without update permission", async () => {
      const assignment = await createAssignment();

      const restrictedAdmin = await Admin.create({
        fullName: "Restricted Responsibility Admin",
        email: "restricted-responsibility@test.com",
        password: "Password123!",
        role: "admin",
        permissions: [],
      });

      const restrictedToken = generateToken(restrictedAdmin);

      const response = await request(app)
        .put(
          `/api/v1/teacher-assignments/result-responsibilities/${mathematicsAllocation._id}`,
        )
        .set("Authorization", `Bearer ${restrictedToken}`)
        .send({
          academicSession: session._id.toString(),
          term: "first",
          teacherAssignment: assignment._id.toString(),
        });

      expect(response.statusCode).toBe(403);

      expect(await SubjectResultResponsibility.countDocuments()).toBe(0);
    });

    test("rejects unauthenticated responsibility designation", async () => {
      const assignment = await createAssignment();

      const response = await request(app)
        .put(
          `/api/v1/teacher-assignments/result-responsibilities/${mathematicsAllocation._id}`,
        )
        .send({
          academicSession: session._id.toString(),
          term: "first",
          teacherAssignment: assignment._id.toString(),
        });

      expect(response.statusCode).toBe(401);
    });
  });
});
