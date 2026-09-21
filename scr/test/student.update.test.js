const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

describe("Student Update API", () => {
  let token;
  let studentId;
  let studentMongoId;

  beforeEach(async () => {
    // Create test admin
    const hashedPassword = await bcrypt.hash("password123", 12);

    const admin = await Admin.create({
      fullName: "Test Admin",
      email: `admin${Date.now()}@test.com`,
      password: hashedPassword,
      role: "admin",
      permissions: ["students.create", "students.update"],
    });

    // Login admin
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: admin.email,
      password: "password123",
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    token = loginResponse.body.token;

    // Create student before update test
    const createResponse = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "John",
        lastName: "Doe",
        otherName: "Michael",
        gender: "Male",
        dateOfBirth: "2012-05-10",
        admissionYear: 2025,
        currentClass: "JSS1",
        session: "2025/2026",
        parentName: "Mr Doe",
        parentPhone: "08012345678",
      });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.student).toBeDefined();

    // Official student ID.
    // Example: 2025/TCC00001
    studentId = createResponse.body.student.studentId;

    // MongoDB document ID used by protected internal routes.
    studentMongoId = createResponse.body.student._id;
  });

  test("Should update a student successfully", async () => {
    const response = await request(app)
      .put(`/api/v1/students/${studentMongoId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "David",
        currentClass: "JSS2",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.student.firstName).toBe("David");
    expect(response.body.student.currentClass).toBe("JSS2");

    // Student ID should remain unchanged.
    expect(response.body.student.studentId).toBe(studentId);
  });

  test("Should not allow student ID to change", async () => {
    const response = await request(app)
      .put(`/api/v1/students/${studentMongoId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId: "TCC99999",
        firstName: "Peter",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    // The official student ID must remain unchanged.
    expect(response.body.student.studentId).toBe(studentId);

    // Other allowed fields should still update.
    expect(response.body.student.firstName).toBe("Peter");
  });

  test("Should return 404 when updating non-existing student", async () => {
    const nonExistingStudentId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .put(`/api/v1/students/${nonExistingStudentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Nobody",
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
