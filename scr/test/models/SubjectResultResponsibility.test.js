const Teacher = require("../../models/Teacher");
const SchoolClass = require("../../models/SchoolClass");
const Subject = require("../../models/Subject");
const ClassSubjectAllocation = require("../../models/ClassSubjectAllocation");
const AcademicSession = require("../../models/AcademicSession");
const TeacherAssignment = require("../../models/TeacherAssignment");
const SubjectResultResponsibility = require("../../models/SubjectResultResponsibility");

describe("SubjectResultResponsibility model", () => {
  let teacher;
  let secondTeacher;
  let schoolClass;
  let subject;
  let allocation;
  let session;
  let secondSession;
  let assignment;
  let secondTeacherAssignment;
  let differentSessionAssignment;

  beforeAll(async () => {
    await SubjectResultResponsibility.init();
  });

  beforeEach(async () => {
    teacher = await Teacher.create({
      fullName: "First Teacher",
      email: "first.teacher@test.com",
      password: "Password123!",
    });

    secondTeacher = await Teacher.create({
      fullName: "Second Teacher",
      email: "second.teacher@test.com",
      password: "Password123!",
    });

    schoolClass = await SchoolClass.create({
      name: "JSS1",
      level: "junior",
      hasDepartments: false,
    });

    subject = await Subject.create({
      name: "Mathematics",
      code: "MTH",
    });

    allocation = await ClassSubjectAllocation.create({
      schoolClass: schoolClass._id,
      department: null,
      subject: subject._id,
    });

    session = await AcademicSession.create({
      name: "2026/2027",
    });

    secondSession = await AcademicSession.create({
      name: "2027/2028",
    });

    assignment = await TeacherAssignment.create({
      teacher: teacher._id,
      allocation: allocation._id,
      academicSession: session._id,
    });

    secondTeacherAssignment = await TeacherAssignment.create({
      teacher: secondTeacher._id,
      allocation: allocation._id,
      academicSession: session._id,
    });

    differentSessionAssignment = await TeacherAssignment.create({
      teacher: teacher._id,
      allocation: allocation._id,
      academicSession: secondSession._id,
    });
  });

  test("creates a valid responsibility", async () => {
    const responsibility = await SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: session._id,
      term: "first",
      teacherAssignment: assignment._id,
    });

    expect(responsibility.allocation.toString()).toBe(
      allocation._id.toString(),
    );

    expect(responsibility.academicSession.toString()).toBe(
      session._id.toString(),
    );

    expect(responsibility.term).toBe("first");

    expect(responsibility.teacherAssignment.toString()).toBe(
      assignment._id.toString(),
    );

    expect(responsibility.assignmentHistory).toHaveLength(0);
  });

  test("allows only one result owner per allocation, session and term", async () => {
    await SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: session._id,
      term: "first",
      teacherAssignment: assignment._id,
    });

    await expect(
      SubjectResultResponsibility.create({
        allocation: allocation._id,
        academicSession: session._id,
        term: "first",
        teacherAssignment: secondTeacherAssignment._id,
      }),
    ).rejects.toMatchObject({
      code: 11000,
    });
  });

  test("allows different result owners for different terms in the same session", async () => {
    await SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: session._id,
      term: "first",
      teacherAssignment: assignment._id,
    });

    const secondTermResponsibility = await SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: session._id,
      term: "second",
      teacherAssignment: secondTeacherAssignment._id,
    });

    expect(secondTermResponsibility.term).toBe("second");

    expect(secondTermResponsibility.teacherAssignment.toString()).toBe(
      secondTeacherAssignment._id.toString(),
    );
  });

  test("allows separate responsibilities for all three terms", async () => {
    const firstTerm = await SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: session._id,
      term: "first",
      teacherAssignment: assignment._id,
    });

    const secondTerm = await SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: session._id,
      term: "second",
      teacherAssignment: secondTeacherAssignment._id,
    });

    const thirdTerm = await SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: session._id,
      term: "third",
      teacherAssignment: assignment._id,
    });

    expect(firstTerm.term).toBe("first");
    expect(secondTerm.term).toBe("second");
    expect(thirdTerm.term).toBe("third");

    const count = await SubjectResultResponsibility.countDocuments({
      allocation: allocation._id,
      academicSession: session._id,
    });

    expect(count).toBe(3);
  });

  test("allows a different result owner in another academic session", async () => {
    await SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: session._id,
      term: "first",
      teacherAssignment: assignment._id,
    });

    const nextSessionResponsibility = await SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: secondSession._id,
      term: "first",
      teacherAssignment: differentSessionAssignment._id,
    });

    expect(nextSessionResponsibility).toBeTruthy();
    expect(nextSessionResponsibility.term).toBe("first");
  });

  test("rejects an invalid term", async () => {
    const responsibility = new SubjectResultResponsibility({
      allocation: allocation._id,
      academicSession: session._id,
      term: "fourth",
      teacherAssignment: assignment._id,
    });

    await expect(responsibility.validate()).rejects.toThrow();
  });

  test("rejects a teacher assignment for a different allocation", async () => {
    const anotherSubject = await Subject.create({
      name: "English",
      code: "ENG",
    });

    const anotherAllocation = await ClassSubjectAllocation.create({
      schoolClass: schoolClass._id,
      department: null,
      subject: anotherSubject._id,
    });

    const responsibility = new SubjectResultResponsibility({
      allocation: anotherAllocation._id,
      academicSession: session._id,
      term: "first",
      teacherAssignment: assignment._id,
    });

    await expect(responsibility.validate()).rejects.toThrow(
      "designated teacher must be assigned to this subject allocation",
    );
  });

  test("rejects a teacher assignment from a different academic session", async () => {
    const responsibility = new SubjectResultResponsibility({
      allocation: allocation._id,
      academicSession: session._id,
      term: "first",
      teacherAssignment: differentSessionAssignment._id,
    });

    await expect(responsibility.validate()).rejects.toThrow(
      "designated teacher assignment must belong to this academic session",
    );
  });

  test("rejects a nonexistent teacher assignment", async () => {
    const responsibility = new SubjectResultResponsibility({
      allocation: allocation._id,
      academicSession: session._id,
      term: "first",
      teacherAssignment: "68c123456789abcdef123456",
    });

    await expect(responsibility.validate()).rejects.toThrow(
      "Selected teacher assignment does not exist",
    );
  });

  test("requires allocation, academic session, term and designated assignment", async () => {
    const responsibility = new SubjectResultResponsibility({});

    await expect(responsibility.validate()).rejects.toThrow();
  });

  test("stores reassignment history entries", async () => {
    const responsibility = await SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: session._id,
      term: "first",
      teacherAssignment: assignment._id,
      assignmentHistory: [
        {
          teacherAssignment: secondTeacherAssignment._id,
          reason: "Previous designated teacher",
        },
      ],
    });

    expect(responsibility.assignmentHistory).toHaveLength(1);

    expect(
      responsibility.assignmentHistory[0].teacherAssignment.toString(),
    ).toBe(secondTeacherAssignment._id.toString());

    expect(responsibility.assignmentHistory[0].reason).toBe(
      "Previous designated teacher",
    );
  });
});
