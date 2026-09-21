const request = require("supertest");
const app = require("../app");
const ActivityLog = require("../models/activityLog");
const setupAdmin = require("./helpers/setupAdmin");

describe("Activity Log", () => {
  let token;

  beforeEach(async () => {
    token = await setupAdmin();
  });

  test("Creating student should create activity log", async () => {
    const response = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "John",
        lastName: "Doe",
        gender: "Male",
        dateOfBirth: "2012-05-10",
        admissionYear: 2025,
        currentClass: "JSS1",
        session: "2025/2026",
        parentName: "Mr Doe",
        parentPhone: "08012345678",
      });

    expect(response.statusCode).toBe(201);

    expect(response.body.success).toBe(true);

    const logs = await ActivityLog.find();

    expect(logs.length).toBeGreaterThan(0);
  });
});
