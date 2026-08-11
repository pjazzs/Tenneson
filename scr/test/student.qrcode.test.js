const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const bcrypt = require("bcrypt");

describe("Student QR Code API", () => {
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
      ],
    });

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: adminEmail,
        password: "password123",
      });

    expect(loginResponse.statusCode).toBe(200);

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

  test("Should generate a QR code successfully", async () => {
    const response = await request(app)
      .get(`/api/v1/students/${studentId}/qrcode`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.qrCode).toBeDefined();

    expect(typeof response.body.qrCode).toBe("string");

    expect(response.body.qrCode).toMatch(/^data:image\/png;base64,/);
  });

  test("Should return 404 when generating QR code for non-existing student", async () => {
    const response = await request(app)
      .get("/api/v1/students/TCC99999/qrcode")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);

    expect(response.body.success).toBe(false);
  });

  test("Should require authentication to generate QR code", async () => {
    const response = await request(app)
      .get(`/api/v1/students/${studentId}/qrcode`);

    expect(response.statusCode).toBe(401);
  });

  test("Should verify a valid student successfully", async () => {
    const response = await request(app)
      .get(`/api/v1/students/qrcode/verify/${studentId}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.verified).toBe(true);

    expect(response.body.student).toBeDefined();

    expect(response.body.student.studentId).toBe(studentId);

    expect(response.body.student.name).toBe("John Doe");

    expect(response.body.student.gender).toBe("Male");

    expect(response.body.student.class).toBe("JSS1");

    expect(response.body.student.session).toBe("2025/2026");
  });

  test("Should reject an invalid student ID during QR verification", async () => {
    const response = await request(app)
      .get("/api/v1/students/qrcode/verify/TCC99999");

    expect(response.statusCode).toBe(404);

    expect(response.body.success).toBe(false);

    expect(response.body.verified).toBe(false);

    expect(response.body.message).toBe("Invalid student ID");
  });

  test("Should not verify an archived student", async () => {
    await Student.findOneAndUpdate(
      { studentId },
      { isActive: false }
    );

    const response = await request(app)
      .get(`/api/v1/students/qrcode/verify/${studentId}`);

    expect(response.statusCode).toBe(404);

    expect(response.body.success).toBe(false);

    expect(response.body.verified).toBe(false);

    expect(response.body.message).toBe("Invalid student ID");
  });

  test("Should not generate QR code for an archived student", async () => {
    await Student.findOneAndUpdate(
      { studentId },
      { isActive: false }
    );

    const response = await request(app)
      .get(`/api/v1/students/${studentId}/qrcode`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);

    expect(response.body.success).toBe(false);
  });
});