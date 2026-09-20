const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

const Admin = require("../models/Admin");
const Student = require("../models/student");
const Result = require("../models/Result");
const AcademicSession = require("../models/AcademicSession");
const Promotion = require("../models/Promotion");

const bcrypt = require("bcrypt");

let superAdminToken;
let promotionViewToken;
let promotionApplyToken;

let sourceSession;
let nextSession;

let promotedStudent;
let repeatStudent;
let graduatedStudent;

let promotedPromotion;
let repeatPromotion;
let graduatedPromotion;

let studentCounter = 1;

const createStudent = async ({
  firstName = "Promotion",
  lastName = "Student",
  currentClass = "JSS1",
  session = "2025/2026",
} = {}) => {
  const studentId = `TCCTEST${String(studentCounter).padStart(4, "0")}`;
  studentCounter += 1;

  return Student.create({
    studentId,
    firstName,
    lastName,
    otherName: "",
    gender: "Male",
    dateOfBirth: "2012-01-15",
    currentClass,
    session,
    parentName: "Parent Name",
    parentPhone: "08012345678",
    isActive: true,
  });
};

const createAdmin = async ({
  email,
  permissions = [],
  role = "admin",
} = {}) => {
  const password = "Password123";

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await Admin.create({
    fullName: email.split("@")[0],
    email,
    password: passwordHash,
    role,
    permissions,
  });

  return {
    admin,
    password,
  };
};

const loginAdmin = async (email, password) => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email,
      password,
    })
    .expect(200);

  return response.body.token;
};

const createPromotion = async ({
  student,
  fromClass,
  toClass,
  decision,
} = {}) => {
  const result = await Result.create({
    student: student._id,
    academicSession: sourceSession._id,
    term: "third",
    currentClass: fromClass,
    subjectResults: [],
    cumulativeScore: 65,
    weightedAverage: 65,
    grade: "B",
    remark: "Good",
    promotionStatus:
      decision === "repeat" ? "recommended_repeat" : "recommended_promoted",
    principalDecision: "promoted",
    status: "approved",
  });

  return Promotion.create({
    student: student._id,
    sourceResult: result._id,
    fromSession: sourceSession._id,
    toSession: nextSession._id,
    fromClass,
    toClass,
    decision,
    appliedBy: new mongoose.Types.ObjectId(),
    appliedAt: new Date(),
  });
};

beforeEach(async () => {
  const [superAdmin, viewAdmin, applyAdmin] = await Promise.all([
    createAdmin({
      email: "promotion-history-super@test.com",
      role: "super_admin",
    }),

    createAdmin({
      email: "promotion-history-view@test.com",
      permissions: ["promotion.view"],
    }),

    createAdmin({
      email: "promotion-history-apply@test.com",
      permissions: ["promotion.apply"],
    }),
  ]);

  superAdminToken = await loginAdmin(
    superAdmin.admin.email,
    superAdmin.password,
  );

  promotionViewToken = await loginAdmin(
    viewAdmin.admin.email,
    viewAdmin.password,
  );

  promotionApplyToken = await loginAdmin(
    applyAdmin.admin.email,
    applyAdmin.password,
  );

  sourceSession = await AcademicSession.create({
    name: "2025/2026",
  });

  nextSession = await AcademicSession.create({
    name: "2026/2027",
  });

  promotedStudent = await createStudent({
    firstName: "John",
    lastName: "Promoted",
    currentClass: "JSS1",
    session: "2026/2027",
  });

  repeatStudent = await createStudent({
    firstName: "Jane",
    lastName: "Repeat",
    currentClass: "JSS2",
    session: "2026/2027",
  });

  graduatedStudent = await createStudent({
    firstName: "Michael",
    lastName: "Graduated",
    currentClass: "Graduated",
    session: "2026/2027",
  });

  promotedPromotion = await createPromotion({
    student: promotedStudent,
    fromClass: "JSS1",
    toClass: "JSS2",
    decision: "promoted",
  });

  repeatPromotion = await createPromotion({
    student: repeatStudent,
    fromClass: "JSS2",
    toClass: "JSS2",
    decision: "repeat",
  });

  graduatedPromotion = await createPromotion({
    student: graduatedStudent,
    fromClass: "SS3",
    toClass: "Graduated",
    decision: "graduated",
  });
});

describe("GET /api/v1/promotions", () => {
  it("should return promotion history for an authorized admin", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.promotions)).toBe(true);

    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        currentPage: 1,
        limit: 20,
        totalPromotions: 3,
        totalPages: 1,
      }),
    );
  });

  it("should allow a super admin to view promotion history", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.promotions).toHaveLength(3);
  });

  it("should reject unauthenticated requests", async () => {
    const response = await request(app).get("/api/v1/promotions").expect(401);

    expect(response.body.success).toBe(false);
  });

  it("should reject an admin without promotion.view permission", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .set("Authorization", `Bearer ${promotionApplyToken}`)
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "You do not have permission to perform this action.",
    );
  });

  it("should filter promotions by decision", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .query({
        decision: "repeat",
      })
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.promotions).toHaveLength(1);

    expect(response.body.promotions[0].decision).toBe("repeat");
    expect(response.body.promotions[0].student.studentId).toBe(
      repeatStudent.studentId,
    );
  });

  it("should filter promotions by fromClass", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .query({
        fromClass: "JSS1",
      })
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.promotions).toHaveLength(1);

    expect(response.body.promotions[0].fromClass).toBe("JSS1");
  });

  it("should filter promotions by toClass", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .query({
        toClass: "Graduated",
      })
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.promotions).toHaveLength(1);

    expect(response.body.promotions[0].toClass).toBe("Graduated");
    expect(response.body.promotions[0].decision).toBe("graduated");
  });

  it("should filter promotions by academic session", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .query({
        academicSession: sourceSession._id.toString(),
      })
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.promotions).toHaveLength(3);

    response.body.promotions.forEach((promotion) => {
      expect(promotion.fromSession._id.toString()).toBe(
        sourceSession._id.toString(),
      );
    });
  });

  it("should search promotions by student name", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .query({
        search: "John Promoted",
      })
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.promotions).toHaveLength(1);

    expect(response.body.promotions[0].student.studentId).toBe(
      promotedStudent.studentId,
    );
  });

  it("should search promotions by student ID", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .query({
        search: promotedStudent.studentId,
      })
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.promotions).toHaveLength(1);

    expect(response.body.promotions[0].student.studentId).toBe(
      promotedStudent.studentId,
    );
  });

  it("should return an empty result when search matches no student", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .query({
        search: "StudentDoesNotExist",
      })
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.promotions).toEqual([]);

    expect(response.body.pagination.totalPromotions).toBe(0);
    expect(response.body.pagination.totalPages).toBe(0);
  });

  it("should reject an invalid academic session ID", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .query({
        academicSession: "invalid-session-id",
      })
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid academic session ID.");
  });

  it("should reject an invalid promotion decision", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .query({
        decision: "invalid",
      })
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid promotion decision.");
  });

  it("should paginate promotion history", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .query({
        page: 2,
        limit: 2,
      })
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);

    expect(response.body.promotions).toHaveLength(1);

    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        currentPage: 2,
        limit: 2,
        totalPromotions: 3,
        totalPages: 2,
      }),
    );
  });

  it("should cap the requested limit at 100", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .query({
        limit: 500,
      })
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.pagination.limit).toBe(100);
  });

  it("should escape regex characters in search input", async () => {
    const response = await request(app)
      .get("/api/v1/promotions")
      .query({
        search: ".*",
      })
      .set("Authorization", `Bearer ${promotionViewToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);

    // `.*` must be treated as literal text, not as a wildcard.
    expect(response.body.promotions).toHaveLength(0);
    expect(response.body.pagination.totalPromotions).toBe(0);
  });
});
