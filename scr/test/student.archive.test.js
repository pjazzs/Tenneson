const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

describe("Student Archive API", () => {
  let token;
  let studentId;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const adminEmail = `admin${Date.now()}@test.com`;

  await Admin.create({
  fullName: "Test Admin",
  email: adminEmail,
  password: hashedPassword,
  role: "admin",
  permissions: [
    "students.create",
    "students.view",
    "students.delete",
    "students.restore",
  ],
});

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: adminEmail,
        password: "password123",
      });

    token = loginResponse.body.token;

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

    expect(studentResponse.statusCode).toBe(201);

    studentId = studentResponse.body.student.studentId;
  });

  test("Should archive a student successfully", async () => {
    const response = await request(app)
      .delete(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Student archived successfully");
  });

  test("Should return archived students", async () => {
    await request(app)
      .delete(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .get("/api/v1/students/archived")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.totalStudents).toBeGreaterThan(0);
    expect(Array.isArray(response.body.students)).toBe(true);

    const archivedStudent = response.body.students.find(
      (student) => student.studentId === studentId
    );

    expect(archivedStudent).toBeDefined();
    expect(archivedStudent.isActive).toBe(false);
  });

  test("Should not include archived student in active students", async () => {
    await request(app)
      .delete(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .get("/api/v1/students")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const archivedStudent = response.body.students.find(
      (student) => student.studentId === studentId
    );

    expect(archivedStudent).toBeUndefined();
  });

  test("Should restore an archived student successfully", async () => {
    await request(app)
      .delete(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .patch(`/api/v1/students/${studentId}/restore`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Student restored successfully");
  });

  test("Should return 404 when restoring non-existing student", async () => {
    const response = await request(app)
      .patch("/api/v1/students/TCC99999/restore")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });
});