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
    await request(app)
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

    const logs = await ActivityLog.find();

    expect(logs.length).toBeGreaterThan(0);
  });
});
