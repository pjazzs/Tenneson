const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

const Admin = require("../models/Admin");
const Student = require("../models/student");
const Subject = require("../models/Subject");
const Result = require("../models/Result");
const Promotion = require("../models/Promotion");
const AcademicSession = require("../models/AcademicSession");

const bcrypt = require("bcrypt");
let studentCounter = 1;

let admin;
let student;
let subject;
let academicSession;
let nextAcademicSession;
let result;

const createAcademicSession = async ({
  name = "2025/2026",
  isActive = true,
} = {}) => {
  return AcademicSession.create({
    name,
    isActive,

    terms: [
      {
        key: "first",
        name: "First Term",
        isActive: false,
      },

      {
        key: "second",
        name: "Second Term",
        isActive: false,
      },

      {
        key: "third",
        name: "Third Term",
        isActive: true,
      },
    ],
  });
};

const createAdmin = async () => {
  const passwordHash = await bcrypt.hash("Password123", 12);

  return Admin.create({
    fullName: "Promotion Admin",

    email: `promotion-${Date.now()}@example.com`,

    password: passwordHash,

    role: "admin",

    permissions: ["promotion.apply"],
  });
};

const createStudent = async ({
  firstName = "Promotion",
  lastName = "Student",
  dateOfBirth = "2012-01-15",
  currentClass = "JSS1",
  session = "2025/2026",
} = {}) => {
  const studentId = `TCCTEST${String(studentCounter).padStart(4, "0")}`;

  studentCounter += 1;

  return Student.create({
    studentId,
    firstName,
    lastName,
    gender: "Male",
    dateOfBirth,
    currentClass,
    session,
    parentName: "Parent Name",
    parentPhone: "08012345678",
    isActive: true,
  });
};

const createSubject = async () => {
  return Subject.create({
    name: "Mathematics",

    code: `MATH${Date.now()}`,

    isActive: true,
  });
};

const createResult = async ({
  resultStudent = student,
  resultSession = academicSession,
  term = "third",
  status = "approved",
  principalDecision = "promoted",
  currentClass = resultStudent.currentClass,
} = {}) => {
  return Result.create({
    student: resultStudent._id,

    academicSession: resultSession._id,

    term,

    currentClass,

    subjectResults: [
      {
        subject: subject._id,

        subjectName: subject.name,

        subjectCode: subject.code,

        offered: true,

        ca1: 15,

        ca2: 8,

        exam: 60,

        total: 83,

        firstTerm: {
          offered: false,

          total: null,
        },

        secondTerm: {
          offered: false,

          total: null,
        },

        cumulativeScore: 83,

        weightedAverage: 83,

        grade: "D",

        remark: "DISTINCTION",

        teacherComment: "Good performance.",
      },
    ],

    totalScore: 83,

    totalObtainableMarks: 100,

    overallPercentage: 83,

    promotionStatus:
      principalDecision === "promoted"
        ? "recommended_promoted"
        : "recommended_repeat",

    principalDecision,

    status,

    performanceComment: "Good performance.",
  });
};

const loginAdmin = async () => {
  const response = await request(app).post("/api/v1/auth/login").send({
    email: admin.email,

    password: "Password123",
  });

  return response.body.token;
};

beforeEach(async () => {
  studentCounter = 1;
  admin = await createAdmin();

  student = await createStudent();

  subject = await createSubject();

  academicSession = await createAcademicSession({
    name: "2025/2026",
  });

  nextAcademicSession = await createAcademicSession({
    name: "2026/2027",

    isActive: false,
  });

  result = await createResult();
});

afterEach(async () => {
  await Promotion.deleteMany({});
  await Result.deleteMany({});
  await Student.deleteMany({});
  await Subject.deleteMany({});
  await AcademicSession.deleteMany({});
  await Admin.deleteMany({});
});

describe("Promotion Controller", () => {
  describe("Apply Promotion", () => {
    test("should promote a JSS1 student to JSS2", async () => {
      const token = await loginAdmin();

      const response = await request(app)
        .patch(`/api/v1/promotions/${result._id}/apply`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(200);

      expect(response.body.success).toBe(true);

      expect(response.body.promotion.decision).toBe("promoted");

      expect(response.body.promotion.fromClass).toBe("JSS1");

      expect(response.body.promotion.toClass).toBe("JSS2");

      expect(response.body.student.currentClass).toBe("JSS2");

      expect(response.body.student.session).toBe("2026/2027");

      const updatedStudent = await Student.findById(student._id);

      expect(updatedStudent.currentClass).toBe("JSS2");

      expect(updatedStudent.session).toBe("2026/2027");
    });

    test("should keep a repeating student in the same class and move to the next session", async () => {
      result.principalDecision = "repeat";

      result.promotionStatus = "recommended_repeat";

      await result.save();

      const token = await loginAdmin();

      const response = await request(app)
        .patch(`/api/v1/promotions/${result._id}/apply`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(200);

      expect(response.body.success).toBe(true);

      expect(response.body.promotion.decision).toBe("repeat");

      expect(response.body.promotion.fromClass).toBe("JSS1");

      expect(response.body.promotion.toClass).toBe("JSS1");

      expect(response.body.student.currentClass).toBe("JSS1");

      expect(response.body.student.session).toBe("2026/2027");
    });

    test("should promote SS2 to SS3", async () => {
      const ss2Student = await createStudent({
        firstName: "SS2",
        lastName: "Promotion",
        currentClass: "SS2",
      });

      const ss2Result = await createResult({
        resultStudent: ss2Student,
      });

      const token = await loginAdmin();

      const response = await request(app)
        .patch(`/api/v1/promotions/${ss2Result._id}/apply`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(200);

      expect(response.body.promotion.decision).toBe("promoted");

      expect(response.body.promotion.fromClass).toBe("SS2");

      expect(response.body.promotion.toClass).toBe("SS3");

      expect(response.body.student.currentClass).toBe("SS3");

      expect(response.body.student.session).toBe("2026/2027");
    });

    test("should graduate an SS3 student", async () => {
      const ss3Student = await createStudent({
        firstName: "SS3",
        lastName: "Promotion",
        currentClass: "SS3",
      });

      const ss3Result = await createResult({
        resultStudent: ss3Student,
      });

      const token = await loginAdmin();

      const response = await request(app)
        .patch(`/api/v1/promotions/${ss3Result._id}/apply`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(200);

      expect(response.body.success).toBe(true);

      expect(response.body.promotion.decision).toBe("graduated");

      expect(response.body.promotion.fromClass).toBe("SS3");

      expect(response.body.promotion.toClass).toBe("Graduated");

      expect(response.body.student.currentClass).toBe("Graduated");

      expect(response.body.student.session).toBe("2026/2027");
    });

    test("should reject a non-third-term result", async () => {
      const firstTermResult = await createResult({
        term: "first",
      });

      const token = await loginAdmin();

      const response = await request(app)
        .patch(`/api/v1/promotions/${firstTermResult._id}/apply`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(400);

      expect(response.body.success).toBe(false);

      expect(response.body.message).toMatch(/third-term/i);
    });

    test("should reject a result that is not approved", async () => {
      result.status = "submitted";

      await result.save();

      const token = await loginAdmin();

      const response = await request(app)
        .patch(`/api/v1/promotions/${result._id}/apply`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(400);

      expect(response.body.success).toBe(false);

      expect(response.body.message).toMatch(/approved/i);
    });

    test("should reject a result without a final Principal decision", async () => {
      result.principalDecision = "pending";

      await result.save();

      const token = await loginAdmin();

      const response = await request(app)
        .patch(`/api/v1/promotions/${result._id}/apply`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(400);

      expect(response.body.success).toBe(false);

      expect(response.body.message).toMatch(/Principal decision/i);
    });

    test("should reject a promotion when the next academic session does not exist", async () => {
      await AcademicSession.deleteOne({
        _id: nextAcademicSession._id,
      });

      const token = await loginAdmin();

      const response = await request(app)
        .patch(`/api/v1/promotions/${result._id}/apply`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(404);

      expect(response.body.success).toBe(false);

      expect(response.body.message).toMatch(/2026\/2027/i);

      const unchangedStudent = await Student.findById(student._id);

      expect(unchangedStudent.currentClass).toBe("JSS1");

      expect(unchangedStudent.session).toBe("2025/2026");
    });

    test("should reject applying the same promotion twice", async () => {
      const token = await loginAdmin();

      const firstResponse = await request(app)
        .patch(`/api/v1/promotions/${result._id}/apply`)
        .set("Authorization", `Bearer ${token}`);

      expect(firstResponse.statusCode).toBe(200);

      const secondResponse = await request(app)
        .patch(`/api/v1/promotions/${result._id}/apply`)
        .set("Authorization", `Bearer ${token}`);

      expect(secondResponse.statusCode).toBe(409);

      expect(secondResponse.body.success).toBe(false);
    });

    test("should reject an admin without promotion.apply permission", async () => {
      admin.permissions = [];

      await admin.save();

      const token = await loginAdmin();

      const response = await request(app)
        .patch(`/api/v1/promotions/${result._id}/apply`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(403);

      expect(response.body.success).toBe(false);
    });

    test("should create a Promotion record", async () => {
      const token = await loginAdmin();

      const response = await request(app)
        .patch(`/api/v1/promotions/${result._id}/apply`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(200);

      const promotion = await Promotion.findOne({
        sourceResult: result._id,
      });

      expect(promotion).not.toBeNull();

      expect(promotion.student.toString()).toBe(student._id.toString());

      expect(promotion.fromSession.toString()).toBe(
        academicSession._id.toString(),
      );

      expect(promotion.toSession.toString()).toBe(
        nextAcademicSession._id.toString(),
      );

      expect(promotion.fromClass).toBe("JSS1");

      expect(promotion.toClass).toBe("JSS2");

      expect(promotion.decision).toBe("promoted");

      expect(promotion.appliedBy.toString()).toBe(admin._id.toString());
    });
  });
});
