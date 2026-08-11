
const request = require("supertest");
const app = require("../../app");
const Admin = require("../../models/Admin");
const bcrypt = require("bcrypt");

const setupAdmin = async () => {
  const uniqueEmail = `superadmin${Date.now()}@test.com`;

  const hashedPassword = await bcrypt.hash("password123", 12);

  await Admin.create({
    fullName: "Super Admin",
    email: uniqueEmail,
    password: hashedPassword,
    role: "super_admin",
  });

  const superAdminLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: uniqueEmail,
      password: "password123",
    });

  const superAdminToken = superAdminLogin.body.token;

  const adminEmail = `admin${Date.now()}@test.com`;

  const registerResponse = await request(app)
    .post("/api/v1/auth/register")
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({
      fullName: "Test Admin",
      email: adminEmail,
      password: "password123",
      permissions: [
        "students.create",
      ],
    });

  expect(registerResponse.statusCode).toBe(201);

  const loginResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: adminEmail,
      password: "password123",
    });

  expect(loginResponse.statusCode).toBe(200);

  return loginResponse.body.token;
};

module.exports = setupAdmin;

