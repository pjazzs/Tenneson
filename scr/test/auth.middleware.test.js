const request = require("supertest");
const app = require("../app");
const bcrypt = require("bcrypt");
  const Admin = require("../models/Admin");
let token;

beforeEach(async () => {

  const hashedPassword = await bcrypt.hash("password123", 10);

  await Admin.create({
    fullName: "Super Admin",
    email: "superadmin@test.com",
    password: hashedPassword,
    role: "super_admin",
  });

  const loginResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "superadmin@test.com",
      password: "password123",
    });

  console.log("LOGIN RESPONSE:", loginResponse.body);

  token = loginResponse.body.token;
});


describe("Auth Middleware", () => {

  test("Should reject request without token", async () => {

    const response = await request(app)
      .get("/api/v1/students");


    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);

  });


  test("Should reject invalid token", async () => {

    const response = await request(app)
      .get("/api/v1/students")
      .set("Authorization", "Bearer wrongtoken123");


    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);

  });


it("Should allow authenticated admin", async () => {

  console.log("TOKEN BEFORE REQUEST:", token);

  const response = await request(app)
    .get("/api/v1/students")
    .set("Authorization", `Bearer ${token}`);

  console.log("RESPONSE BODY:", response.body);

  expect(response.statusCode).toBe(200);
  expect(response.body.success).toBe(true);

});

});