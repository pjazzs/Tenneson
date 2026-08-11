
const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

let token;

beforeEach(async () => {
  const hashedPassword = await bcrypt.hash("password123", 10);
  const email = `admin${Date.now()}@test.com`;

  await Admin.create({
    fullName: "Test Admin",
    email,
    password: hashedPassword,
    role: "admin",
    permissions: [
      "students.create",
    ],
  });

  const loginResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email,
      password: "password123",
    });

  token = loginResponse.body.token;
});

describe("Student Validation Tests", () => {
  test("Should reject student without firstName", async () => {
    const response = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        lastName: "Doe",
        gender: "Male",
        dateOfBirth: "2012-05-10",
        currentClass: "JSS1",
        session: "2025/2026",
      });

    expect(response.statusCode).toBe(400);
  });

  test("Should reject student without lastName", async () => {
    const response = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "John",
        gender: "Male",
        dateOfBirth: "2012-05-10",
        currentClass: "JSS1",
        session: "2025/2026",
      });

    expect(response.statusCode).toBe(400);
  });

  test("Should reject invalid gender", async () => {
    const response = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "John",
        lastName: "Doe",
        gender: "Unknown",
        dateOfBirth: "2012-05-10",
        currentClass: "JSS1",
        session: "2025/2026",
      });

    expect(response.statusCode).toBe(400);
  });

  test("Should create valid student", async () => {
    const response = await request(app)
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

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
  });
});

