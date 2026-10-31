const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");

const Teacher = require("../models/Teacher");
const SchoolClass = require("../models/SchoolClass");
const Subject = require("../models/Subject");
const ClassSubjectAllocation = require("../models/ClassSubjectAllocation");
const AcademicSession = require("../models/AcademicSession");
const TeacherAssignment = require("../models/TeacherAssignment");
const SubjectResultResponsibility = require("../models/SubjectResultResponsibility");
const SubjectResultSubmission = require("../models/SubjectResultSubmission");
const Student = require("../models/student");

describe("TEACHER SUBJECT RESULT API", () => {
  let teacher;
  let secondTeacher;

  let schoolClass;
  let mathematics;
  let allocation;
  let session;

  let assignment;
  let responsibility;

  let student;
  let secondStudent;

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

  const createStudent = async (overrides = {}) => {
    const count = await Student.countDocuments();

    return Student.create({
      studentId: `TCC${String(count + 1).padStart(5, "0")}`,
      firstName: `Student${count + 1}`,
      lastName: "Test",
      otherName: "",
      gender: "Male",
      dateOfBirth: new Date("2010-01-01"),
      currentClass: "JSS1",
      department: null,
      session: "2026/2027",
      isActive: true,
      ...overrides,
    });
  };

  const createAssignment = async (
    selectedTeacher = teacher,
    overrides = {},
  ) => {
    return TeacherAssignment.create({
      teacher: selectedTeacher._id,
      allocation: allocation._id,
      academicSession: session._id,
      isActive: true,
      ...overrides,
    });
  };

  const createResponsibility = async (selectedAssignment = assignment) => {
    return SubjectResultResponsibility.create({
      allocation: allocation._id,
      academicSession: session._id,
      term: "first",
      teacherAssignment: selectedAssignment._id,
    });
  };

  const createDraft = async (rows = []) => {
    return SubjectResultSubmission.create({
      allocation: allocation._id,
      academicSession: session._id,
      term: "first",
      responsibility: responsibility._id,
      studentResults: rows,
      status: "draft",
      createdByTeacher: teacher._id,
      updatedByTeacher: teacher._id,
    });
  };

  const scoreFor = (selectedStudent, scores = {}) => ({
    student: selectedStudent._id.toString(),
    ca1: 15,
    ca2: 8,
    exam: 60,
    ...scores,
  });

  const saveDraft = (studentResults, selectedTeacher = teacher) =>
    request(app)
      .put(`/api/v1/teacher/subject-results/${allocation._id}/draft`)
      .set(auth(selectedTeacher))
      .send({
        academicSessionId: session._id.toString(),
        term: "first",
        studentResults,
      });

  const submitResults = (selectedTeacher = teacher) =>
    request(app)
      .post(`/api/v1/teacher/subject-results/${allocation._id}/submit`)
      .set(auth(selectedTeacher))
      .send({
        academicSessionId: session._id.toString(),
        term: "first",
      });

  // Always find a student's saved row by ID.
  // The API sorts eligible students, so array position is not guaranteed.
  const findSavedStudent = (submission, selectedStudent) =>
    submission.studentResults.find(
      (row) => row.student.toString() === selectedStudent._id.toString(),
    );

  beforeEach(async () => {
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

    teacher = await createTeacher({
      fullName: "John Teacher",
      email: "john@test.com",
    });

    secondTeacher = await createTeacher({
      fullName: "Jane Teacher",
      email: "jane@test.com",
    });

    allocation = await ClassSubjectAllocation.create({
      schoolClass: schoolClass._id,
      department: null,
      subject: mathematics._id,
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

    assignment = await createAssignment();

    responsibility = await createResponsibility();

    student = await createStudent({
      studentId: "TCC00001",
      firstName: "John",
      lastName: "Student",
    });

    secondStudent = await createStudent({
      studentId: "TCC00002",
      firstName: "Jane",
      lastName: "Student",
    });
  });

  // ---------------------------------------------------------
  // GET MY SUBJECT RESULT RESPONSIBILITIES
  // ---------------------------------------------------------

  describe("GET /api/v1/teacher/my-subject-results", () => {
    const getResponsibilities = (selectedTeacher = teacher) =>
      request(app)
        .get("/api/v1/teacher/my-subject-results")
        .query({
          academicSessionId: session._id.toString(),
          term: "first",
        })
        .set(auth(selectedTeacher));

    test("returns the teacher's assigned subject responsibilities", async () => {
      const response = await getResponsibilities();

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.assignments).toHaveLength(1);

      expect(response.body.assignments[0].isResultOwner).toBe(true);
      expect(response.body.assignments[0].canEdit).toBe(true);
      expect(response.body.assignments[0].allocation.subject.name).toBe(
        "Mathematics",
      );
    });

    test("returns the number of eligible students", async () => {
      const response = await getResponsibilities();

      expect(response.statusCode).toBe(200);

      expect(response.body.assignments[0].submission.eligibleStudents).toBe(2);
    });

    test("identifies an assigned teacher who is not the result owner", async () => {
      await createAssignment(secondTeacher);

      const response = await getResponsibilities(secondTeacher);

      expect(response.statusCode).toBe(200);
      expect(response.body.assignments).toHaveLength(1);
      expect(response.body.assignments[0].isResultOwner).toBe(false);
      expect(response.body.assignments[0].canEdit).toBe(false);
    });

    test("does not return another teacher's assignments", async () => {
      const response = await getResponsibilities(secondTeacher);

      expect(response.statusCode).toBe(200);
      expect(response.body.assignments).toHaveLength(0);
    });

    test("rejects a missing academic session", async () => {
      const response = await request(app)
        .get("/api/v1/teacher/my-subject-results")
        .query({ term: "first" })
        .set(auth());

      expect(response.statusCode).toBe(400);
    });

    test("rejects an invalid term", async () => {
      const response = await request(app)
        .get("/api/v1/teacher/my-subject-results")
        .query({
          academicSessionId: session._id.toString(),
          term: "fourth",
        })
        .set(auth());

      expect(response.statusCode).toBe(400);
    });

    test("rejects unauthenticated requests", async () => {
      const response = await request(app).get(
        "/api/v1/teacher/my-subject-results",
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ---------------------------------------------------------
  // GET SUBJECT RESULT ENTRY
  // ---------------------------------------------------------

  describe("GET /api/v1/teacher/subject-results/:allocationId", () => {
    const getSubjectResults = (
      selectedTeacher = teacher,
      selectedAllocation = allocation._id,
    ) =>
      request(app)
        .get(`/api/v1/teacher/subject-results/${selectedAllocation}`)
        .query({
          academicSessionId: session._id.toString(),
          term: "first",
        })
        .set(auth(selectedTeacher));

    test("returns eligible students for the assigned subject", async () => {
      const response = await getSubjectResults();

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.totalEligibleStudents).toBe(2);
      expect(response.body.studentResults).toHaveLength(2);
    });

    test("returns the student identity and empty score fields", async () => {
      const response = await getSubjectResults();

      expect(response.statusCode).toBe(200);

      const row = response.body.studentResults.find(
        (item) => item.student.toString() === student._id.toString(),
      );

      expect(row).toBeDefined();
      expect(row.studentId).toBe("TCC00001");
      expect(row.studentName).toBe("John Student");
      expect(row.offered).toBe(true);
      expect(row.ca1).toBeNull();
      expect(row.ca2).toBeNull();
      expect(row.exam).toBeNull();
    });

    test("does not include inactive students", async () => {
      await createStudent({
        studentId: "TCC00003",
        isActive: false,
      });

      const response = await getSubjectResults();

      expect(response.statusCode).toBe(200);
      expect(response.body.totalEligibleStudents).toBe(2);
    });

    test("does not include students from another class", async () => {
      await createStudent({
        studentId: "TCC00004",
        currentClass: "JSS2",
      });

      const response = await getSubjectResults();

      expect(response.statusCode).toBe(200);
      expect(response.body.totalEligibleStudents).toBe(2);
    });

    test("allows an assigned non-owner to view but not edit", async () => {
      await createAssignment(secondTeacher);

      const response = await getSubjectResults(secondTeacher);

      expect(response.statusCode).toBe(200);
      expect(response.body.isResultOwner).toBe(false);
      expect(response.body.canEdit).toBe(false);
    });

    test("rejects a teacher who is not assigned to the allocation", async () => {
      const response = await getSubjectResults(secondTeacher);

      expect(response.statusCode).toBe(403);
    });

    test("rejects an invalid allocation ID", async () => {
      const response = await getSubjectResults(teacher, "invalid-id");

      expect(response.statusCode).toBe(400);
    });

    test("rejects unauthenticated requests", async () => {
      const response = await request(app)
        .get(`/api/v1/teacher/subject-results/${allocation._id}`)
        .query({
          academicSessionId: session._id.toString(),
          term: "first",
        });

      expect(response.statusCode).toBe(401);
    });
  });

  // ---------------------------------------------------------
  // SAVE SUBJECT RESULT DRAFT
  // ---------------------------------------------------------

  describe("PUT /api/v1/teacher/subject-results/:allocationId/draft", () => {
    test("creates a draft with student scores", async () => {
      const response = await saveDraft([
        scoreFor(student),
        scoreFor(secondStudent),
      ]);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.submission.status).toBe("draft");
      expect(response.body.submission.totalEligibleStudents).toBe(2);
      expect(response.body.submission.completedStudents).toBe(2);

      const submission = await SubjectResultSubmission.findOne({
        allocation: allocation._id,
        academicSession: session._id,
        term: "first",
      });

      expect(submission).not.toBeNull();
      expect(submission.studentResults).toHaveLength(2);
      expect(submission.status).toBe("draft");
    });

    test("allows incomplete scores to be saved as a draft", async () => {
      const response = await saveDraft([
        scoreFor(student, {
          ca1: 15,
          ca2: null,
          exam: null,
        }),
      ]);

      expect(response.statusCode).toBe(200);
      expect(response.body.submission.status).toBe("draft");
      expect(response.body.submission.completedStudents).toBe(0);

      const submission = await SubjectResultSubmission.findOne({
        allocation: allocation._id,
        term: "first",
      });

      const savedStudent = findSavedStudent(submission, student);

      expect(savedStudent).toBeDefined();
      expect(savedStudent.ca1).toBe(15);
      expect(savedStudent.ca2).toBeNull();
      expect(savedStudent.exam).toBeNull();
    });

    test("preserves existing scores when updating only some score fields", async () => {
      await saveDraft([
        scoreFor(student, {
          ca1: 15,
          ca2: 8,
          exam: 60,
        }),
      ]);

      const response = await saveDraft([
        {
          student: student._id.toString(),
          ca1: 18,
        },
      ]);

      expect(response.statusCode).toBe(200);

      const submission = await SubjectResultSubmission.findOne({
        allocation: allocation._id,
        term: "first",
      });

      const savedStudent = findSavedStudent(submission, student);

      expect(savedStudent).toBeDefined();
      expect(savedStudent.ca1).toBe(18);
      expect(savedStudent.ca2).toBe(8);
      expect(savedStudent.exam).toBe(60);
    });

    test("rejects a CA1 score above 20", async () => {
      const response = await saveDraft([scoreFor(student, { ca1: 21 })]);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/CA1/);
    });

    test("rejects a CA2 score above 10", async () => {
      const response = await saveDraft([scoreFor(student, { ca2: 11 })]);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/CA2/);
    });

    test("rejects an examination score above 70", async () => {
      const response = await saveDraft([scoreFor(student, { exam: 71 })]);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/Examination/);
    });

    test("rejects negative scores", async () => {
      const response = await saveDraft([scoreFor(student, { ca1: -1 })]);

      expect(response.statusCode).toBe(400);
    });

    test("rejects a student who is not eligible for the allocation", async () => {
      const outsider = await createStudent({
        studentId: "TCC00999",
        currentClass: "JSS2",
      });

      const response = await saveDraft([scoreFor(outsider)]);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/not eligible/i);
    });

    test("rejects duplicate student entries in one update", async () => {
      const response = await saveDraft([
        scoreFor(student),
        scoreFor(student, { ca1: 10 }),
      ]);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/more than once/i);
    });

    test("rejects a teacher who is not the designated result owner", async () => {
      await createAssignment(secondTeacher);

      const response = await saveDraft([scoreFor(student)], secondTeacher);

      expect(response.statusCode).toBe(403);
    });

    test("rejects saving when no result responsibility exists", async () => {
      await SubjectResultResponsibility.deleteMany({});

      const response = await saveDraft([scoreFor(student)]);

      expect(response.statusCode).toBe(404);
    });

    test("rejects saving after the submission has been submitted", async () => {
      await createDraft([
        {
          student: student._id,
          studentId: student.studentId,
          studentName: "John Student",
          ca1: 15,
          ca2: 8,
          exam: 60,
        },
        {
          student: secondStudent._id,
          studentId: secondStudent.studentId,
          studentName: "Jane Student",
          ca1: 15,
          ca2: 8,
          exam: 60,
        },
      ]);

      const submission = await SubjectResultSubmission.findOne({
        allocation: allocation._id,
        term: "first",
      });

      submission.status = "submitted";
      await submission.save();

      const response = await saveDraft([scoreFor(student, { ca1: 10 })]);

      expect(response.statusCode).toBe(409);
    });

    test("rejects unauthenticated draft saving", async () => {
      const response = await request(app)
        .put(`/api/v1/teacher/subject-results/${allocation._id}/draft`)
        .send({
          academicSessionId: session._id.toString(),
          term: "first",
          studentResults: [scoreFor(student)],
        });

      expect(response.statusCode).toBe(401);
    });
  });

  // ---------------------------------------------------------
  // SUBMIT SUBJECT RESULTS
  // ---------------------------------------------------------

  describe("POST /api/v1/teacher/subject-results/:allocationId/submit", () => {
    test("rejects submission when no draft exists", async () => {
      const response = await submitResults();

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toMatch(/draft/i);
    });

    test("rejects submission when some students have incomplete scores", async () => {
      await saveDraft([
        scoreFor(student),
        scoreFor(secondStudent, {
          ca1: 15,
          ca2: null,
          exam: null,
        }),
      ]);

      const response = await submitResults();

      expect(response.statusCode).toBe(400);
      expect(response.body.completion.eligibleStudents).toBe(2);
      expect(response.body.completion.incompleteStudents).toBe(1);
      expect(response.body.incompleteStudents).toHaveLength(1);
    });

    test("submits the subject results when every eligible student has complete scores", async () => {
      await saveDraft([scoreFor(student), scoreFor(secondStudent)]);

      const response = await submitResults();

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.submission.status).toBe("submitted");
      expect(response.body.submission.totalStudents).toBe(2);

      const submission = await SubjectResultSubmission.findOne({
        allocation: allocation._id,
        term: "first",
      });

      expect(submission.status).toBe("submitted");
      expect(submission.submittedAt).toBeInstanceOf(Date);
      expect(submission.submittedByTeacher.toString()).toBe(
        teacher._id.toString(),
      );
    });

    test("does not allow the teacher to submit the same results twice", async () => {
      await saveDraft([scoreFor(student), scoreFor(secondStudent)]);

      const firstResponse = await submitResults();
      const secondResponse = await submitResults();

      expect(firstResponse.statusCode).toBe(200);
      expect(secondResponse.statusCode).toBe(409);
    });

    test("rejects submission by a teacher who is not the designated owner", async () => {
      await createAssignment(secondTeacher);

      await saveDraft([scoreFor(student), scoreFor(secondStudent)]);

      const response = await submitResults(secondTeacher);

      expect(response.statusCode).toBe(403);
    });

    test("rejects unauthenticated submission", async () => {
      const response = await request(app)
        .post(`/api/v1/teacher/subject-results/${allocation._id}/submit`)
        .send({
          academicSessionId: session._id.toString(),
          term: "first",
        });

      expect(response.statusCode).toBe(401);
    });
  });
});
