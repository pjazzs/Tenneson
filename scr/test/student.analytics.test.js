const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const Student = require("../models/student");
const bcrypt = require("bcrypt");

describe("Student Analytics API", () => {
  let token;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const adminEmail = `admin${Date.now()}@test.com`;

    await Admin.create({
      fullName: "Test Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      permissions: [],
    });

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: adminEmail,
        password: "password123",
      });

    token = loginResponse.body.token;
  });

  test("Should return monthly registration analytics", async () => {
    const response = await request(app)
      .get("/api/v1/students/analytics/monthly")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.year).toBe(new Date().getFullYear());

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(12);

    expect(response.body.data[0]).toEqual({
      month: "January",
      count: expect.any(Number),
    });

    expect(response.body.data[11]).toEqual({
      month: "December",
      count: expect.any(Number),
    });
  });

  test("Should correctly count monthly student registrations", async () => {
    const currentYear = new Date().getFullYear();

    await Student.create([
      {
        studentId: "TCC90001",
        firstName: "January",
        lastName: "Student",
        gender: "Male",
        dateOfBirth: new Date("2012-01-10"),
        currentClass: "JSS1",
        session: "2025/2026",
        isActive: true,
        createdAt: new Date(currentYear, 0, 10),
      },
      {
        studentId: "TCC90002",
        firstName: "January",
        lastName: "Student",
        gender: "Female",
        dateOfBirth: new Date("2012-01-11"),
        currentClass: "JSS1",
        session: "2025/2026",
        isActive: true,
        createdAt: new Date(currentYear, 0, 20),
      },
      {
        studentId: "TCC90003",
        firstName: "February",
        lastName: "Student",
        gender: "Male",
        dateOfBirth: new Date("2012-02-10"),
        currentClass: "JSS2",
        session: "2025/2026",
        isActive: true,
        createdAt: new Date(currentYear, 1, 10),
      },
    ]);

    const response = await request(app)
      .get("/api/v1/students/analytics/monthly")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const january = response.body.data.find(
      (item) => item.month === "January"
    );

    const february = response.body.data.find(
      (item) => item.month === "February"
    );

    expect(january.count).toBe(2);
    expect(february.count).toBe(1);
  });

  test("Should reject monthly analytics without authentication", async () => {
    const response = await request(app).get(
      "/api/v1/students/analytics/monthly"
    );

    expect(response.statusCode).toBe(401);
  });

  test("Should return class analytics", async () => {
    await Student.create([
      {
        studentId: "TCC91001",
        firstName: "John",
        lastName: "Doe",
        gender: "Male",
        dateOfBirth: new Date("2012-05-10"),
        currentClass: "JSS1",
        session: "2025/2026",
        isActive: true,
      },
      {
        studentId: "TCC91002",
        firstName: "Jane",
        lastName: "Doe",
        gender: "Female",
        dateOfBirth: new Date("2012-06-10"),
        currentClass: "JSS1",
        session: "2025/2026",
        isActive: true,
      },
      {
        studentId: "TCC91003",
        firstName: "Peter",
        lastName: "Smith",
        gender: "Male",
        dateOfBirth: new Date("2011-03-20"),
        currentClass: "JSS2",
        session: "2025/2026",
        isActive: true,
      },
    ]);

    const response = await request(app)
      .get("/api/v1/students/analytics/classes")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(Array.isArray(response.body.data)).toBe(true);

    const jss1 = response.body.data.find(
      (item) => item._id === "JSS1"
    );

    const jss2 = response.body.data.find(
      (item) => item._id === "JSS2"
    );

    expect(jss1.count).toBe(2);
    expect(jss2.count).toBe(1);
  });

  test("Should only include active students in class analytics", async () => {
    await Student.create([
      {
        studentId: "TCC92001",
        firstName: "Active",
        lastName: "Student",
        gender: "Male",
        dateOfBirth: new Date("2012-05-10"),
        currentClass: "JSS1",
        session: "2025/2026",
        isActive: true,
      },
      {
        studentId: "TCC92002",
        firstName: "Archived",
        lastName: "Student",
        gender: "Female",
        dateOfBirth: new Date("2012-06-10"),
        currentClass: "JSS1",
        session: "2025/2026",
        isActive: false,
      },
    ]);

    const response = await request(app)
      .get("/api/v1/students/analytics/classes")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const jss1 = response.body.data.find(
      (item) => item._id === "JSS1"
    );

    expect(jss1.count).toBe(1);
  });

  test("Should reject class analytics without authentication", async () => {
    const response = await request(app).get(
      "/api/v1/students/analytics/classes"
    );

    expect(response.statusCode).toBe(401);
  });
});