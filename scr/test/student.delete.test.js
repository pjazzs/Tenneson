
const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

describe("Student Delete API", () => {
  let token;
  let studentId;

  beforeEach(async () => {
    // Create admin
    const hashedPassword = await bcrypt.hash("password123", 12);

    const email = `admin${Date.now()}@test.com`;

    await Admin.create({
      fullName: "Test Admin",
      email,
      password: hashedPassword,
      role: "admin",
      permissions: [
        "students.create",
        "students.delete",
      ],
    });

    // Login admin
    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email,
        password: "password123",
      });

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
        currentClass: "JSS1",
        session: "2025/2026",
      });

    studentId = studentResponse.body.student.studentId;
  });

  test("Should delete a student successfully", async () => {
    const response = await request(app)
      .delete(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("Should return 404 when deleting non-existing student", async () => {
    const response = await request(app)
      .delete("/api/v1/students/TCC99999")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

