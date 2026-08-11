
const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const AuditLog = require("../models/AuditLog");
const bcrypt = require("bcrypt");

describe("Audit Logs API", () => {
  let token;
  let admin;

  beforeEach(async () => {
    const password = await bcrypt.hash("password123", 10);

    admin = await Admin.create({
      fullName: "Audit Test Admin",
      email: `audit${Date.now()}@test.com`,
      password,
      role: "admin",
    });

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: admin.email,
        password: "password123",
      });

    expect(loginResponse.statusCode).toBe(200);

    token = loginResponse.body.token;
  });

  test("Should return audit logs in newest-first order", async () => {
  const olderLog = await AuditLog.create({
    user: admin._id,
    action: "OLDER_ACTION",
    module: "TEST",
    description: "Older audit log",
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
  });

  const newerLog = await AuditLog.create({
    user: admin._id,
    action: "NEWER_ACTION",
    module: "TEST",
    description: "Newer audit log",
    createdAt: new Date("2026-08-01T10:00:00.000Z"),
  });

  const response = await request(app)
    .get("/api/v1/audit")
    .set("Authorization", `Bearer ${token}`);

  expect(response.statusCode).toBe(200);
  expect(response.body.success).toBe(true);

  const logs = response.body.logs;

  const olderIndex = logs.findIndex(
    (log) => log.action === "OLDER_ACTION"
  );

  const newerIndex = logs.findIndex(
    (log) => log.action === "NEWER_ACTION"
  );

  expect(newerIndex).toBeLessThan(olderIndex);
});

  test("Should get audit logs successfully", async () => {
    await AuditLog.create({
      user: admin._id,
      action: "TEST_ACTION",
      module: "TEST",
      description: "Test audit log",
    });

    const response = await request(app)
      .get("/api/v1/audit")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.logs)).toBe(true);
    expect(response.body.logs.length).toBeGreaterThan(0);
  });

  test("Should reject audit logs request without authentication", async () => {
    const response = await request(app)
      .get("/api/v1/audit");

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("Should populate audit log user information", async () => {
    await AuditLog.create({
      user: admin._id,
      action: "TEST_ACTION",
      module: "TEST",
      description: "Test audit log",
    });

    const response = await request(app)
      .get("/api/v1/audit")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    const log = response.body.logs.find(
      (item) => item.action === "TEST_ACTION"
    );

    expect(log).toBeDefined();
    expect(log.user).toBeDefined();
    expect(log.user.fullName).toBe("Audit Test Admin");
    expect(log.user.email).toBe(admin.email);
    expect(log.user.role).toBe("admin");
  });
});