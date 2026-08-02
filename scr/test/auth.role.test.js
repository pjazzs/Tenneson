const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

let superAdminToken;
let normalAdminToken;

beforeEach(async () => {
  const Admin = require("../models/Admin");

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Create super admin
  await Admin.create({
    fullName: "Super Admin",
    email: "superadmin@test.com",
    password: hashedPassword,
    role: "super_admin",
  });


  // Login super admin
  const superLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "superadmin@test.com",
      password: "password123",
    });

  superAdminToken = superLogin.body.token;


  // Create normal admin
  await Admin.create({
    fullName: "Normal Admin",
    email: "admin@test.com",
    password: hashedPassword,
    role: "admin",
  });


  // Login normal admin
  const adminLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "admin@test.com",
      password: "password123",
    });

  normalAdminToken = adminLogin.body.token;
});


test("Super admin should register admin", async () => {

  const response = await request(app)
    .post("/api/v1/auth/register")
    .set(
      "Authorization",
      `Bearer ${superAdminToken}`
    )
    .send({
      fullName: "New Admin",
      email: "newadmin@test.com",
      password: "password123",
      role: "admin",
    });


  expect(response.statusCode).toBe(201);
});


test("Normal admin should not register admin", async () => {

  const response = await request(app)
    .post("/api/v1/auth/register")
    .set(
      "Authorization",
      `Bearer ${normalAdminToken}`
    )
    .send({
      fullName: "Blocked Admin",
      email: "blocked@test.com",
      password: "password123",
      role: "admin",
    });


  expect(response.statusCode).toBe(403);

});