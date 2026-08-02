const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

let superAdminToken;

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

  superAdminToken = loginResponse.body.token;
});


describe("Admin Registration Validation", () => {

  test("Should reject registration without fullName", async () => {

    const response = await request(app)
      .post("/api/v1/auth/register")
      .set(
        "Authorization",
        `Bearer ${superAdminToken}`
      )
      .send({
        email: "admin@test.com",
        password: "password123",
        role: "admin",
      });


    expect(response.statusCode).toBe(400);

  });


  test("Should reject registration without email", async () => {

    const response = await request(app)
      .post("/api/v1/auth/register")
      .set(
        "Authorization",
        `Bearer ${superAdminToken}`
      )
      .send({
        fullName: "New Admin",
        password: "password123",
        role: "admin",
      });


    expect(response.statusCode).toBe(400);

  });


  test("Should reject duplicate email", async () => {

    await request(app)
      .post("/api/v1/auth/register")
      .set(
        "Authorization",
        `Bearer ${superAdminToken}`
      )
      .send({
        fullName: "Existing Admin",
        email: "admin@test.com",
        password: "password123",
        role: "admin",
      });


    const response = await request(app)
      .post("/api/v1/auth/register")
      .set(
        "Authorization",
        `Bearer ${superAdminToken}`
      )
      .send({
        fullName: "Another Admin",
        email: "admin@test.com",
        password: "password123",
        role: "admin",
      });


    expect(response.statusCode).toBe(409);

  });

});