process.env.NODE_ENV = "production";
const request = require("supertest");
const app = require("../app");

describe("Authentication Rate Limiting", () => {

  test("Should block excessive login attempts", async () => {

    let response;

    for (let i = 0; i < 6; i++) {
      response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "wrong@gmail.com",
          password: "wrongpassword",
        });
    }

    expect(response.statusCode).toBe(429);

    expect(response.body.message)
      .toBe("Too many login attempts. Please try again in 15 minutes.");

  });

});