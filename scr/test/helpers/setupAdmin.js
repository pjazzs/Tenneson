const request = require("supertest");
const app = require("../../app");
const Admin = require("../../models/Admin");
const bcrypt = require("bcrypt");

const setupAdmin = async () => {
  const hashedPassword = await bcrypt.hash("password123", 12);

  await Admin.create({
    fullName: "Super Admin",
    email: "superadmin@test.com",
    password: hashedPassword,
    role: "super_admin",
  });

  const superAdminLogin = await request(app).post("/api/v1/auth/login").send({
    email: "superadmin@test.com",
    password: "password123",
  });

  const superAdminToken = superAdminLogin.body.token;

  const email = `admin${Date.now()}@test.com`;

  await request(app)
    .post("/api/v1/auth/register")
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({
      fullName: "Test Admin",
      email,
      password: "password123",
    });

  const loginResponse = await request(app).post("/api/v1/auth/login").send({
    email,
    password: "password123",
  });

  return loginResponse.body.token;
};

module.exports = setupAdmin;
