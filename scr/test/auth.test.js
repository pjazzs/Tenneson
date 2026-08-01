const request = require("supertest");

const app = require("../app");

describe("Authentication", () => {
  test("Login without email should return 400", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
      password: "Password1234",
    });

    expect(response.statusCode).toBe(400);
  });
});
