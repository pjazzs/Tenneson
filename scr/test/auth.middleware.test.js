const request = require("supertest");
const app = require("../app");

describe("Authorization Middleware", () => {
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
});
