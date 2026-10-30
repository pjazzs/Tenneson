const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");

const Teacher = require("../models/Teacher");
const SchoolClass = require("../models/SchoolClass");
const Subject = require("../models/Subject");
const ClassSubjectAllocation = require("../models/ClassSubjectAllocation");
const AcademicSession = require("../models/AcademicSession");
const TeacherAssignment = require("../models/TeacherAssignment");

describe("TEACHER PORTAL API", () => {
  let teacher;
  let secondTeacher;

  let schoolClass;
  let mathematics;
  let english;

  let mathematicsAllocation;
  let englishAllocation;

  let session;

  const createTeacher = async (overrides = {}) => {
    const count = await Teacher.countDocuments();

    return Teacher.create({
      fullName: `Test Teacher ${count + 1}`,
      email: `teacher${count + 1}@test.com`,
      password: "Password123!",
      mustChangePassword: false,
      ...overrides,
    });
  };

  const generateTeacherToken = (selectedTeacher = teacher) => {
    return jwt.sign(
      {
        id: selectedTeacher._id.toString(),
        type: "teacher",
        tokenVersion: selectedTeacher.tokenVersion || 0,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );
  };

  const auth = (selectedTeacher = teacher) => ({
    Authorization: `Bearer ${generateTeacherToken(selectedTeacher)}`,
  });

  const createAssignment = async (overrides = {}) => {
    return TeacherAssignment.create({
      teacher: teacher._id,
      allocation: mathematicsAllocation._id,
      academicSession: session._id,
      ...overrides,
    });
  };

  beforeEach(async () => {
    schoolClass = await SchoolClass.create({
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

    mathematicsAllocation = await ClassSubjectAllocation.create({
      schoolClass: schoolClass._id,
      department: null,
      subject: mathematics._id,
      isActive: true,
    });

    englishAllocation = await ClassSubjectAllocation.create({
      schoolClass: schoolClass._id,
      department: null,
      subject: english._id,
      isActive: true,
    });

    session = await AcademicSession.create({
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
  });

  /*
  |--------------------------------------------------------------------------
  | GET MY ASSIGNMENTS
  |--------------------------------------------------------------------------
  */

  describe("GET /api/v1/teacher/my-assignments", () => {
    test("returns the authenticated teacher's assignments", async () => {
      await createAssignment();

      const response = await request(app)
        .get("/api/v1/teacher/my-assignments")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.totalAssignments).toBe(1);
      expect(response.body.assignments).toHaveLength(1);
    });

    test("returns populated class, subject and academic session details", async () => {
      await createAssignment();

      const response = await request(app)
        .get("/api/v1/teacher/my-assignments")
        .set(auth());

      expect(response.statusCode).toBe(200);

      const assignment = response.body.assignments[0];

      expect(assignment.allocation.schoolClass.name).toBe("JSS1");
      expect(assignment.allocation.subject.name).toBe("Mathematics");
      expect(assignment.academicSession.name).toBe("2026/2027");
    });

    test("returns multiple assignments belonging to the same teacher", async () => {
      await createAssignment();

      await createAssignment({
        allocation: englishAllocation._id,
      });

      const response = await request(app)
        .get("/api/v1/teacher/my-assignments")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.totalAssignments).toBe(2);
      expect(response.body.assignments).toHaveLength(2);
    });

    test("does not return another teacher's assignments", async () => {
      await createAssignment();

      await createAssignment({
        teacher: secondTeacher._id,
        allocation: englishAllocation._id,
      });

      const response = await request(app)
        .get("/api/v1/teacher/my-assignments")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.totalAssignments).toBe(1);

      expect(response.body.assignments[0].allocation.subject.name).toBe(
        "Mathematics",
      );
    });

    test("does not return inactive assignments", async () => {
      await createAssignment({
        isActive: false,
      });

      const response = await request(app)
        .get("/api/v1/teacher/my-assignments")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.totalAssignments).toBe(0);
      expect(response.body.assignments).toHaveLength(0);
    });

    test("does not return assignments with inactive allocations", async () => {
      await createAssignment();

      mathematicsAllocation.isActive = false;
      await mathematicsAllocation.save();

      const response = await request(app)
        .get("/api/v1/teacher/my-assignments")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.totalAssignments).toBe(0);
    });

    test("does not return assignments with inactive classes", async () => {
      await createAssignment();

      schoolClass.isActive = false;
      await schoolClass.save();

      const response = await request(app)
        .get("/api/v1/teacher/my-assignments")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.totalAssignments).toBe(0);
    });

    test("does not return assignments with inactive subjects", async () => {
      await createAssignment();

      mathematics.isActive = false;
      await mathematics.save();

      const response = await request(app)
        .get("/api/v1/teacher/my-assignments")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.totalAssignments).toBe(0);
    });

    test("returns an empty array when the teacher has no assignments", async () => {
      const response = await request(app)
        .get("/api/v1/teacher/my-assignments")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.totalAssignments).toBe(0);
      expect(response.body.assignments).toEqual([]);
    });

    test("rejects requests without authentication", async () => {
      const response = await request(app).get("/api/v1/teacher/my-assignments");

      expect(response.statusCode).toBe(401);
    });

    test("rejects an admin token", async () => {
      const adminToken = jwt.sign(
        {
          id: teacher._id.toString(),
          type: "admin",
          tokenVersion: 0,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        },
      );

      const response = await request(app)
        .get("/api/v1/teacher/my-assignments")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(401);
    });

    test("rejects an inactive teacher", async () => {
      teacher.isActive = false;
      teacher.tokenVersion += 1;
      await teacher.save();

      const response = await request(app)
        .get("/api/v1/teacher/my-assignments")
        .set(auth());

      expect(response.statusCode).toBe(401);
    });

    test("rejects a teacher who must still change their password", async () => {
      teacher.mustChangePassword = true;
      await teacher.save();

      const response = await request(app)
        .get("/api/v1/teacher/my-assignments")
        .set(auth());

      expect(response.statusCode).toBe(403);
      expect(response.body.requiresPasswordChange).toBe(true);
    });
  });
});
