
const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

describe("Student API", () => {
  let token;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const admin = await Admin.create({
      fullName: "Test Admin",
      email: `admin${Date.now()}@test.com`,
      password: hashedPassword,
      role: "admin",
      permissions: [
        "students.create",
        "students.view",
      ],
    });

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: admin.email,
        password: "password123",
      });

    expect(loginResponse.statusCode).toBe(200);

    token = loginResponse.body.token;
  });

  test("Should create a student", async () => {
    const response = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "John",
        lastName: "Doe",
        otherName: "Michael",
        gender: "Male",
        dateOfBirth: "2012-05-10",
        currentClass: "JSS1",
        session: "2025/2026",
        parentName: "Mr Doe",
        parentPhone: "08012345678",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.student.studentId).toBeDefined();
  });

  test("Should get a single student", async () => {
    const createResponse = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "John",
        lastName: "Doe",
        gender: "Male",
        dateOfBirth: "2012-05-10",
        currentClass: "JSS1",
        session: "2025/2026",
      });

    expect(createResponse.statusCode).toBe(201);

    const studentId = createResponse.body.student.studentId;

    const response = await request(app)
      .get(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.student.studentId).toBe(studentId);
  });

  test("Should return 404 when getting a non-existing student", async () => {
    const response = await request(app)
      .get("/api/v1/students/TCC99999")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test("Should reject getting a student without authentication", async () => {
    const response = await request(app)
      .get("/api/v1/students/TCC00001");

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("Should require students.view permission to get a student", async () => {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const adminEmail = `noview${Date.now()}@test.com`;

    await Admin.create({
      fullName: "No View Permission Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      permissions: [
        "students.create",
      ],
    });

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: adminEmail,
        password: "password123",
      });

    expect(loginResponse.statusCode).toBe(200);

    const noPermissionToken = loginResponse.body.token;

    const response = await request(app)
      .get("/api/v1/students/TCC00001")
      .set(
        "Authorization",
        `Bearer ${noPermissionToken}`
      );

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
  });

  test("Should get all students", async () => {
    const response = await request(app)
      .get("/api/v1/students")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.students)).toBe(true);
  });
});
