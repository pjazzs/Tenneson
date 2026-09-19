const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const ActivityLog = require("../models/activityLog");
const bcrypt = require("bcrypt");

describe("Activity Logs API", () => {
  let token;
  let admin;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash("password123", 12);

    admin = await Admin.create({
      fullName: "Test Admin",
      email: `activity${Date.now()}@test.com`,
      password: hashedPassword,
      role: "admin",
      permissions: ["students.view"],
    });

    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: admin.email,
      password: "password123",
    });

    expect(loginResponse.statusCode).toBe(200);

    token = loginResponse.body.token;
  });

  test("Should return activity logs successfully", async () => {
    await ActivityLog.create([
      {
        admin: admin._id,
        action: "CREATE_STUDENT",
        studentId: "TCC00001",
        details: "Created student John Doe",
      },
      {
        admin: admin._id,
        action: "UPDATE_STUDENT",
        studentId: "TCC00001",
        details: "Updated student John Doe",
      },
    ]);

    const response = await request(app)
      .get("/api/v1/students/activity-logs")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.count).toBe(2);

    expect(response.body.page).toBe(1);

    expect(response.body.limit).toBe(20);

    expect(response.body.totalPages).toBe(1);

    expect(Array.isArray(response.body.logs)).toBe(true);

    expect(response.body.logs).toHaveLength(2);
  });

  test("Should paginate activity logs", async () => {
    const logs = [];

    for (let i = 1; i <= 25; i++) {
      logs.push({
        admin: admin._id,
        action: "CREATE_STUDENT",
        studentId: `TCC${String(i).padStart(5, "0")}`,
        details: `Created student ${i}`,
      });
    }

    await ActivityLog.insertMany(logs);

    const response = await request(app)
      .get("/api/v1/students/activity-logs?page=2&limit=10")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.count).toBe(25);

    expect(response.body.page).toBe(2);

    expect(response.body.limit).toBe(10);

    expect(response.body.totalPages).toBe(3);

    expect(Array.isArray(response.body.logs)).toBe(true);

    expect(response.body.logs).toHaveLength(10);
  });

  test("Should return the correct final page", async () => {
    const logs = [];

    for (let i = 1; i <= 25; i++) {
      logs.push({
        admin: admin._id,
        action: "CREATE_STUDENT",
        studentId: `TCC${String(i).padStart(5, "0")}`,
        details: `Created student ${i}`,
      });
    }

    await ActivityLog.insertMany(logs);

    const response = await request(app)
      .get("/api/v1/students/activity-logs?page=3&limit=10")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.count).toBe(25);

    expect(response.body.page).toBe(3);

    expect(response.body.limit).toBe(10);

    expect(response.body.totalPages).toBe(3);

    expect(response.body.logs).toHaveLength(5);
  });

  test("Should use default pagination values", async () => {
    const logs = [];

    for (let i = 1; i <= 25; i++) {
      logs.push({
        admin: admin._id,
        action: "CREATE_STUDENT",
        studentId: `TCC${String(i).padStart(5, "0")}`,
        details: `Created student ${i}`,
      });
    }

    await ActivityLog.insertMany(logs);

    const response = await request(app)
      .get("/api/v1/students/activity-logs")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.count).toBe(25);

    expect(response.body.page).toBe(1);

    expect(response.body.limit).toBe(20);

    expect(response.body.totalPages).toBe(2);

    expect(response.body.logs).toHaveLength(20);
  });

  test("Should cap the requested limit at 100", async () => {
    const logs = [];

    for (let i = 1; i <= 105; i++) {
      logs.push({
        admin: admin._id,
        action: "CREATE_STUDENT",
        studentId: `TCC${String(i).padStart(5, "0")}`,
        details: `Created student ${i}`,
      });
    }

    await ActivityLog.insertMany(logs);

    const response = await request(app)
      .get("/api/v1/students/activity-logs?limit=1000")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.count).toBe(105);

    expect(response.body.limit).toBe(100);

    expect(response.body.logs).toHaveLength(100);

    expect(response.body.totalPages).toBe(2);
  });

  test("Should return 401 without authentication", async () => {
    const response = await request(app).get("/api/v1/students/activity-logs");

    expect(response.statusCode).toBe(401);

    expect(response.body.success).toBe(false);
  });

  test("Should return 403 without students.view permission", async () => {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const restrictedAdmin = await Admin.create({
      fullName: "Restricted Admin",
      email: `restricted${Date.now()}@test.com`,
      password: hashedPassword,
      role: "admin",
      permissions: [],
    });

    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: restrictedAdmin.email,
      password: "password123",
    });

    expect(loginResponse.statusCode).toBe(200);

    const restrictedToken = loginResponse.body.token;

    const response = await request(app)
      .get("/api/v1/students/activity-logs")
      .set("Authorization", `Bearer ${restrictedToken}`);

    expect(response.statusCode).toBe(403);

    expect(response.body.success).toBe(false);
  });

  test("Should return logs in descending order by creation date", async () => {
    const firstLog = await ActivityLog.create({
      admin: admin._id,
      action: "CREATE_STUDENT",
      studentId: "TCC00001",
      details: "First log",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const secondLog = await ActivityLog.create({
      admin: admin._id,
      action: "UPDATE_STUDENT",
      studentId: "TCC00001",
      details: "Second log",
    });

    const response = await request(app)
      .get("/api/v1/students/activity-logs")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.logs).toHaveLength(2);

    expect(response.body.logs[0]._id).toBe(secondLog._id.toString());

    expect(response.body.logs[1]._id).toBe(firstLog._id.toString());
  });
});
