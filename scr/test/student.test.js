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

    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: admin.email,
      password: "password123",
    });

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

   
    const studentId = createResponse.body.student.studentId;

    const response = await request(app)
      .get(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.student.studentId).toBe(studentId);
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
