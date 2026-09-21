const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

describe("Student Delete API", () => {
  let token;
  let studentId;
  let studentMongoId;

  beforeEach(async () => {
    // Create admin
    const hashedPassword = await bcrypt.hash("password123", 12);

    const email = `admin${Date.now()}@test.com`;

    const admin = await Admin.create({
      fullName: "Test Admin",
      email,
      password: hashedPassword,
      role: "admin",
      permissions: ["students.create", "students.delete"],
    });

    // Login admin
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: admin.email,
      password: "password123",
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    token = loginResponse.body.token;

    // Create student
    const studentResponse = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "John",
        lastName: "Doe",
        gender: "Male",
        dateOfBirth: "2012-05-10",
        admissionYear: 2025,
        currentClass: "JSS1",
        session: "2025/2026",
        parentPhone: "08012345678",
      });

    expect(studentResponse.statusCode).toBe(201);
    expect(studentResponse.body.student).toBeDefined();

    // Official student ID.
    // Example: 2025/TCC00001
    studentId = studentResponse.body.student.studentId;

    // MongoDB document ID used by protected internal routes.
    studentMongoId = studentResponse.body.student._id;
  });

  test("Should delete a student successfully", async () => {
    const response = await request(app)
      .delete(`/api/v1/students/${studentMongoId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("Should return 404 when deleting non-existing student", async () => {
    const nonExistingStudentId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .delete(`/api/v1/students/${nonExistingStudentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
