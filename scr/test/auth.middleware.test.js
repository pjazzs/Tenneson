const request = require("supertest");
const app = require("../app");
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin");
const generateToken = require("../utils/generateToken");
let token;

beforeEach(async () => {
  const hashedPassword = await bcrypt.hash("password123", 10);

  await Admin.create({
    fullName: "Super Admin",
    email: "superadmin@test.com",
    password: hashedPassword,
    role: "super_admin",
    isActive: true,
  });

  const loginResponse = await request(app).post("/api/v1/auth/login").send({
    email: "superadmin@test.com",
    password: "password123",
  });

  token = loginResponse.body.token;
});

describe("Auth Middleware", () => {
  test("Should reject admin token after token version is changed", async () => {
    const admin = await Admin.findOne({
      email: "superadmin@test.com",
    });

    expect(admin).toBeTruthy();

    const oldToken = token;

    await Admin.updateOne({ _id: admin._id }, { $inc: { tokenVersion: 1 } });

    const response = await request(app)
      .get("/api/v1/students")
      .set("Authorization", `Bearer ${oldToken}`);

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Admin authentication token is no longer valid.",
    );
  });
  test("Should reject authenticated admin when admin account is inactive", async () => {
    const admin = await Admin.findOne({
      email: "superadmin@test.com",
    });

    expect(admin).toBeTruthy();

    await Admin.updateOne({ _id: admin._id }, { $set: { isActive: false } });

    const response = await request(app)
      .get("/api/v1/students")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Admin account is inactive.");
  });
  test("Should reject invalid token", async () => {
    const response = await request(app)
      .get("/api/v1/students")
      .set("Authorization", "Bearer wrongtoken123");

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("Should allow authenticated admin", async () => {
    const response = await request(app)
      .get("/api/v1/students")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
  test("Should reject request without token", async () => {
    const response = await request(app).get("/api/v1/students");

    expect(response.statusCode).toBe(401);

    expect(response.body.message).toBe("Access denied. No token provided.");
  });

  test("Should reject invalid token", async () => {
    const response = await request(app)
      .get("/api/v1/students")
      .set("Authorization", "Bearer invalidtoken123");

    expect(response.statusCode).toBe(401);
  });

  test("Should reject malformed authorization header", async () => {
    const response = await request(app)
      .get("/api/v1/students")
      .set("Authorization", "invalidToken");

    expect(response.statusCode).toBe(401);
  });
});
