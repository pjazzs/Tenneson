const mongoose = require("mongoose");

const Teacher = require("../models/Teacher");
const ClassSubjectAllocation = require("../models/ClassSubjectAllocation");
const TeacherAssignment = require("../models/TeacherAssignment");

const Admin = require("../models/Admin");
const SchoolClass = require("../models/SchoolClass");
const Department = require("../models/Department");
const Subject = require("../models/Subject");
const AcademicSession = require("../models/AcademicSession");

describe("SUBJECT ALLOCATION AND TEACHER ASSIGNMENT MODELS", () => {
  let admin;

  let jss1;
  let ss1;

  let arts;
  let science;

  let mathematics;
  let english;

  let session;
  let secondSession;

  let teacherA;
  let teacherB;

  beforeAll(async () => {
    await Promise.all([
      Teacher.init(),
      ClassSubjectAllocation.init(),
      TeacherAssignment.init(),
    ]);
  });

  beforeEach(async () => {
    admin = await Admin.create({
      fullName: "Test Administrator",
      email: "admin@test.com",
      password: "Password123!",
    });

    jss1 = await SchoolClass.create({
      name: "JSS1",
      level: "junior",
      hasDepartments: false,
    });

    ss1 = await SchoolClass.create({
      name: "SS1",
      level: "senior",
      hasDepartments: true,
    });

    arts = await Department.create({
      name: "Arts",
      code: "ART",
    });

    science = await Department.create({
      name: "Science",
      code: "SCI",
    });

    mathematics = await Subject.create({
      name: "Mathematics",
      code: "MATH",
    });

    english = await Subject.create({
      name: "English Language",
      code: "ENG",
    });

    session = await AcademicSession.create({
      name: "2026/2027",
      isActive: true,
    });

    secondSession = await AcademicSession.create({
      name: "2027/2028",
      isActive: false,
    });

    teacherA = await Teacher.create({
      fullName: "Teacher One",
      email: "teacher1@test.com",
      password: "HashedPassword123!",
      employeeId: "TCH001",
    });

    teacherB = await Teacher.create({
      fullName: "Teacher Two",
      email: "teacher2@test.com",
      password: "HashedPassword123!",
      employeeId: "TCH002",
    });
  });

  /*
  |--------------------------------------------------------------------------
  | TEACHER MODEL
  |--------------------------------------------------------------------------
  */

  describe("Teacher model", () => {
    test("creates a teacher successfully", async () => {
      const teacher = await Teacher.findById(teacherA._id);

      expect(teacher).toBeTruthy();
      expect(teacher.fullName).toBe("Teacher One");
      expect(teacher.email).toBe("teacher1@test.com");
      expect(teacher.isActive).toBe(true);
      expect(teacher.mustChangePassword).toBe(true);
      expect(teacher.tokenVersion).toBe(0);
    });

    test("normalizes teacher email to lowercase", async () => {
      const teacher = await Teacher.create({
        fullName: "Teacher Three",
        email: "TEACHER3@TEST.COM",
        password: "HashedPassword123!",
      });

      expect(teacher.email).toBe("teacher3@test.com");
    });

    test("allows multiple teachers without employee IDs", async () => {
      const first = await Teacher.create({
        fullName: "Teacher Four",
        email: "teacher4@test.com",
        password: "HashedPassword123!",
      });

      const second = await Teacher.create({
        fullName: "Teacher Five",
        email: "teacher5@test.com",
        password: "HashedPassword123!",
      });

      expect(first.employeeId).toBeUndefined();
      expect(second.employeeId).toBeUndefined();
    });

    test("does not expose password in ordinary queries and verifies hashed passwords", async () => {
      const teacher = await Teacher.findById(teacherA._id);

      expect(teacher.password).toBeUndefined();

      const teacherWithPassword = await Teacher.findById(teacherA._id).select(
        "+password",
      );

      expect(teacherWithPassword.password).not.toBe("HashedPassword123!");

      const isPasswordCorrect =
        await teacherWithPassword.comparePassword("HashedPassword123!");

      expect(isPasswordCorrect).toBe(true);
    });

    test("rejects duplicate teacher emails", async () => {
      await expect(
        Teacher.create({
          fullName: "Duplicate Teacher",
          email: "teacher1@test.com",
          password: "HashedPassword123!",
        }),
      ).rejects.toMatchObject({
        code: 11000,
      });
    });

    test("rejects duplicate employee IDs", async () => {
      await expect(
        Teacher.create({
          fullName: "Duplicate Employee",
          email: "duplicate@test.com",
          password: "HashedPassword123!",
          employeeId: "TCH001",
        }),
      ).rejects.toMatchObject({
        code: 11000,
      });
    });
  });

  /*
  |--------------------------------------------------------------------------
  | CLASS SUBJECT ALLOCATION MODEL
  |--------------------------------------------------------------------------
  */

  describe("ClassSubjectAllocation model", () => {
    test("allocates a subject to a junior class without a department", async () => {
      const allocation = await ClassSubjectAllocation.create({
        schoolClass: jss1._id,
        subject: mathematics._id,
        createdBy: admin._id,
      });

      expect(allocation).toBeTruthy();
      expect(allocation.schoolClass.toString()).toBe(jss1._id.toString());
      expect(allocation.department).toBeNull();
      expect(allocation.subject.toString()).toBe(mathematics._id.toString());
      expect(allocation.isActive).toBe(true);
    });

    test("allocates a subject to a senior class department", async () => {
      const allocation = await ClassSubjectAllocation.create({
        schoolClass: ss1._id,
        department: arts._id,
        subject: mathematics._id,
        createdBy: admin._id,
      });

      expect(allocation).toBeTruthy();
      expect(allocation.department.toString()).toBe(arts._id.toString());
    });

    test("allows the same subject in different senior departments", async () => {
      const artsAllocation = await ClassSubjectAllocation.create({
        schoolClass: ss1._id,
        department: arts._id,
        subject: mathematics._id,
      });

      const scienceAllocation = await ClassSubjectAllocation.create({
        schoolClass: ss1._id,
        department: science._id,
        subject: mathematics._id,
      });

      expect(artsAllocation.subject.toString()).toBe(
        scienceAllocation.subject.toString(),
      );

      expect(artsAllocation.department.toString()).not.toBe(
        scienceAllocation.department.toString(),
      );
    });

    test("rejects a junior allocation with a department", async () => {
      const allocation = new ClassSubjectAllocation({
        schoolClass: jss1._id,
        department: arts._id,
        subject: mathematics._id,
      });

      await expect(allocation.validate()).rejects.toMatchObject({
        errors: expect.objectContaining({
          department: expect.anything(),
        }),
      });
    });

    test("rejects a senior allocation without a department", async () => {
      const allocation = new ClassSubjectAllocation({
        schoolClass: ss1._id,
        subject: mathematics._id,
      });

      await expect(allocation.validate()).rejects.toMatchObject({
        errors: expect.objectContaining({
          department: expect.anything(),
        }),
      });
    });

    test("rejects a duplicate allocation in the same class and department", async () => {
      const allocationData = {
        schoolClass: ss1._id,
        department: arts._id,
        subject: mathematics._id,
      };

      await ClassSubjectAllocation.create(allocationData);

      await expect(
        ClassSubjectAllocation.create(allocationData),
      ).rejects.toMatchObject({
        code: 11000,
      });
    });

    test("rejects a reference to a nonexistent subject", async () => {
      const allocation = new ClassSubjectAllocation({
        schoolClass: jss1._id,
        subject: new mongoose.Types.ObjectId(),
      });

      await expect(allocation.validate()).rejects.toMatchObject({
        errors: expect.objectContaining({
          subject: expect.anything(),
        }),
      });
    });

    test("rejects a reference to a nonexistent class", async () => {
      const allocation = new ClassSubjectAllocation({
        schoolClass: new mongoose.Types.ObjectId(),
        subject: mathematics._id,
      });

      await expect(allocation.validate()).rejects.toMatchObject({
        errors: expect.objectContaining({
          schoolClass: expect.anything(),
        }),
      });
    });
  });

  /*
  |--------------------------------------------------------------------------
  | TEACHER ASSIGNMENT MODEL
  |--------------------------------------------------------------------------
  */

  describe("TeacherAssignment model", () => {
    let allocation;

    beforeEach(async () => {
      allocation = await ClassSubjectAllocation.create({
        schoolClass: ss1._id,
        department: arts._id,
        subject: mathematics._id,
        createdBy: admin._id,
      });
    });

    test("assigns a teacher to a subject allocation and session", async () => {
      const assignment = await TeacherAssignment.create({
        teacher: teacherA._id,
        allocation: allocation._id,
        academicSession: session._id,
        assignedBy: admin._id,
      });

      expect(assignment).toBeTruthy();
      expect(assignment.teacher.toString()).toBe(teacherA._id.toString());
      expect(assignment.allocation.toString()).toBe(allocation._id.toString());
      expect(assignment.academicSession.toString()).toBe(
        session._id.toString(),
      );
      expect(assignment.isActive).toBe(true);
    });

    test("allows multiple teachers on the same allocation in one session", async () => {
      const firstAssignment = await TeacherAssignment.create({
        teacher: teacherA._id,
        allocation: allocation._id,
        academicSession: session._id,
      });

      const secondAssignment = await TeacherAssignment.create({
        teacher: teacherB._id,
        allocation: allocation._id,
        academicSession: session._id,
      });

      expect(firstAssignment.allocation.toString()).toBe(
        secondAssignment.allocation.toString(),
      );

      expect(firstAssignment.teacher.toString()).not.toBe(
        secondAssignment.teacher.toString(),
      );
    });

    test("rejects the same teacher being assigned the same allocation twice in one session", async () => {
      const assignmentData = {
        teacher: teacherA._id,
        allocation: allocation._id,
        academicSession: session._id,
      };

      await TeacherAssignment.create(assignmentData);

      await expect(
        TeacherAssignment.create(assignmentData),
      ).rejects.toMatchObject({
        code: 11000,
      });
    });

    test("allows the same teacher to receive the allocation in another session", async () => {
      const firstAssignment = await TeacherAssignment.create({
        teacher: teacherA._id,
        allocation: allocation._id,
        academicSession: session._id,
      });

      const secondAssignment = await TeacherAssignment.create({
        teacher: teacherA._id,
        allocation: allocation._id,
        academicSession: secondSession._id,
      });

      expect(firstAssignment._id).toBeTruthy();
      expect(secondAssignment._id).toBeTruthy();

      expect(firstAssignment.academicSession.toString()).not.toBe(
        secondAssignment.academicSession.toString(),
      );
    });

    test("rejects an assignment with a nonexistent teacher", async () => {
      const assignment = new TeacherAssignment({
        teacher: new mongoose.Types.ObjectId(),
        allocation: allocation._id,
        academicSession: session._id,
      });

      await expect(assignment.validate()).rejects.toMatchObject({
        errors: expect.objectContaining({
          teacher: expect.anything(),
        }),
      });
    });

    test("rejects an assignment with a nonexistent allocation", async () => {
      const assignment = new TeacherAssignment({
        teacher: teacherA._id,
        allocation: new mongoose.Types.ObjectId(),
        academicSession: session._id,
      });

      await expect(assignment.validate()).rejects.toMatchObject({
        errors: expect.objectContaining({
          allocation: expect.anything(),
        }),
      });
    });

    test("rejects an assignment with a nonexistent academic session", async () => {
      const assignment = new TeacherAssignment({
        teacher: teacherA._id,
        allocation: allocation._id,
        academicSession: new mongoose.Types.ObjectId(),
      });

      await expect(assignment.validate()).rejects.toMatchObject({
        errors: expect.objectContaining({
          academicSession: expect.anything(),
        }),
      });
    });
  });
});
