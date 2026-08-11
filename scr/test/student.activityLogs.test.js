const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const ActivityLog = require("../models/activityLog");
const bcrypt = require("bcrypt");

describe("Student Activity Logs API", () => {
  let token;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash(
      "password123",
      12
    );

    const adminEmail = `activitylogs${Date.now()}@test.com`;

    await Admin.create({
      fullName: "Activity Log Admin",
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

    await ActivityLog.create({
      admin: (
        await Admin.findOne({
          email: adminEmail,
        })
      )._id,
      action: "TEST_ACTION",
      details: "Test activity log",
    });
  });

  test("Should return activity logs successfully", async () => {
    const response = await request(app)
      .get("/api/v1/students/activity-logs")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.count).toBeGreaterThan(0);

    expect(Array.isArray(response.body.logs)).toBe(true);

    expect(response.body.logs.length).toBeGreaterThan(0);
  });

  test("Should return activity log details", async () => {
    const response = await request(app)
      .get("/api/v1/students/activity-logs")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    const log = response.body.logs[0];

    expect(log).toBeDefined();

    expect(log.action).toBeDefined();

    expect(log.details).toBeDefined();

    expect(log.createdAt).toBeDefined();
  });

  test("Should reject activity logs request without authentication", async () => {
    const response = await request(app).get(
      "/api/v1/students/activity-logs"
    );

    expect(response.statusCode).toBe(401);

    expect(response.body.success).toBe(false);
  });

  test("Should require students.view permission", async () => {
    const hashedPassword = await bcrypt.hash(
      "password123",
      12
    );

    const adminEmail = `nologs${Date.now()}@test.com`;

    await Admin.create({
      fullName: "No View Permission Admin",
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

    expect(loginResponse.statusCode).toBe(200);

    const noPermissionToken =
      loginResponse.body.token;

    const response = await request(app)
      .get("/api/v1/students/activity-logs")
      .set(
        "Authorization",
        `Bearer ${noPermissionToken}`
      );

    expect(response.statusCode).toBe(403);

    expect(response.body.success).toBe(false);
  });
});