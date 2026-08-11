const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const bcrypt = require("bcrypt");

describe("Student Export API", () => {
  let token;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const adminEmail = `exportadmin${Date.now()}@test.com`;

    await Admin.create({
      fullName: "Export Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      permissions: [
        "students.create",
        "students.view",
        "students.export",
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

    await Student.create([
      {
        studentId: "TCC00001",
        firstName: "John",
        lastName: "Doe",
        gender: "Male",
        dateOfBirth: new Date("2012-05-10"),
        currentClass: "JSS1",
        session: "2025/2026",
        parentName: "Mr Doe",
        parentPhone: "08011111111",
        isActive: true,
      },
      {
        studentId: "TCC00002",
        firstName: "Jane",
        lastName: "Smith",
        gender: "Female",
        dateOfBirth: new Date("2011-06-15"),
        currentClass: "JSS2",
        session: "2025/2026",
        parentName: "Mrs Smith",
        parentPhone: "08022222222",
        isActive: true,
      },
      {
        studentId: "TCC00003",
        firstName: "Peter",
        lastName: "Brown",
        gender: "Male",
        dateOfBirth: new Date("2010-03-20"),
        currentClass: "JSS3",
        session: "2024/2025",
        parentName: "Mr Brown",
        parentPhone: "08033333333",
        isActive: false,
      },
    ]);
  });

  test("Should export active students successfully", async () => {
    const response = await request(app)
      .get("/api/v1/students/export")
      .set("Authorization", `Bearer ${token}`)
      .responseType("blob");

    expect(response.statusCode).toBe(200);

    expect(response.headers["content-type"]).toMatch(
      /spreadsheet|excel|octet-stream/
    );

    expect(response.headers["content-disposition"]).toBeDefined();

    expect(response.headers["content-disposition"]).toMatch(
      /Students\.xlsx/
    );

    expect(response.body).toBeInstanceOf(Buffer);

    expect(response.body.length).toBeGreaterThan(0);
  });

  test("Should export archived students when status is archived", async () => {
    const response = await request(app)
      .get("/api/v1/students/export?status=archived")
      .set("Authorization", `Bearer ${token}`)
      .responseType("blob");

    expect(response.statusCode).toBe(200);

    expect(response.headers["content-disposition"]).toMatch(
      /Students\.xlsx/
    );

    expect(response.body).toBeInstanceOf(Buffer);

    expect(response.body.length).toBeGreaterThan(0);
  });

  test("Should filter students by class", async () => {
    const response = await request(app)
      .get("/api/v1/students/export?class=JSS1")
      .set("Authorization", `Bearer ${token}`)
      .responseType("blob");

    expect(response.statusCode).toBe(200);

    expect(response.body).toBeInstanceOf(Buffer);

    expect(response.body.length).toBeGreaterThan(0);
  });

  test("Should filter students by gender", async () => {
    const response = await request(app)
      .get("/api/v1/students/export?gender=Female")
      .set("Authorization", `Bearer ${token}`)
      .responseType("blob");

    expect(response.statusCode).toBe(200);

    expect(response.body).toBeInstanceOf(Buffer);

    expect(response.body.length).toBeGreaterThan(0);
  });

  test("Should filter students by session", async () => {
    const response = await request(app)
      .get("/api/v1/students/export?session=2025/2026")
      .set("Authorization", `Bearer ${token}`)
      .responseType("blob");

    expect(response.statusCode).toBe(200);

    expect(response.body).toBeInstanceOf(Buffer);

    expect(response.body.length).toBeGreaterThan(0);
  });

  test("Should filter students by search", async () => {
    const response = await request(app)
      .get("/api/v1/students/export?search=John")
      .set("Authorization", `Bearer ${token}`)
      .responseType("blob");

    expect(response.statusCode).toBe(200);

    expect(response.body).toBeInstanceOf(Buffer);

    expect(response.body.length).toBeGreaterThan(0);
  });

  test("Should require students.export permission", async () => {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const adminEmail = `noexport${Date.now()}@test.com`;

    await Admin.create({
      fullName: "No Export Permission Admin",
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

    const noPermissionToken = loginResponse.body.token;

    const response = await request(app)
      .get("/api/v1/students/export")
      .set(
        "Authorization",
        `Bearer ${noPermissionToken}`
      );

    expect(response.statusCode).toBe(403);

    expect(response.body.success).toBe(false);
  });

  test("Should reject export without authentication", async () => {
    const response = await request(app)
      .get("/api/v1/students/export");

    expect(response.statusCode).toBe(401);
  });
});