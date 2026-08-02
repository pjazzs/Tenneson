const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

let superAdminToken;
let adminToken;

beforeEach(async () => {

  const password = await bcrypt.hash("password123", 10);

  // Create super admin
  await Admin.create({
    fullName: "Super Admin",
    email: "superadmin@test.com",
    password,
    role: "super_admin",
  });

  // Create normal admin
  await Admin.create({
    fullName: "Normal Admin",
    email: "admin@test.com",
    password,
    role: "admin",
  });


  // Login super admin
  const superLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "superadmin@test.com",
      password: "password123",
    });

  superAdminToken = superLogin.body.token;


  // Login normal admin
  const adminLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "admin@test.com",
      password: "password123",
    });

  adminToken = adminLogin.body.token;

});


describe("Authorization Middleware", () => {


  test("Should allow super admin access", async () => {

    const response = await request(app)
      .post("/api/v1/auth/register")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        fullName: "Another Admin",
        email: "another@test.com",
        password: "password123",
        role: "admin",
      });


    expect(response.statusCode).toBe(201);

  });



  test("Should block normal admin from super admin route", async () => {

    const response = await request(app)
      .post("/api/v1/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        fullName: "Another Admin",
        email: "another@test.com",
        password: "password123",
        role: "admin",
      });


    expect(response.statusCode).toBe(403);

    expect(response.body.message)
      .toBe("You do not have permission to perform this action.");

  });



  test("Should block request without token", async () => {

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        fullName: "Another Admin",
        email: "another@test.com",
        password: "password123",
        role: "admin",
      });


    expect(response.statusCode).toBe(401);

  });


});