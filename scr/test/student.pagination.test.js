
const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

describe("Student Pagination API", () => {
  let token;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash("password123", 12);
    const superAdminEmail = `superadmin${Date.now()}@test.com`;

    await Admin.create({
      fullName: "Super Admin",
      email: superAdminEmail,
      password: hashedPassword,
      role: "super_admin",
    });

    const superAdminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: superAdminEmail,
        password: "password123",
      });

    const superAdminToken = superAdminLogin.body.token;

    const adminEmail = `admin${Date.now()}@test.com`;

    await request(app)
      .post("/api/v1/auth/register")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        fullName: "Test Admin",
        email: adminEmail,
        password: "password123",
        permissions: [
          "students.create",
          "students.view",
        ],
      });

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: adminEmail,
        password: "password123",
      });

    token = loginResponse.body.token;

    // Create students
    for (let i = 0; i < 12; i++) {
      await request(app)
        .post("/api/v1/students")
        .set("Authorization", `Bearer ${token}`)
        .send({
          firstName: `Student${i}`,
          lastName: "Test",
          gender: "Male",
          dateOfBirth: "2012-05-10",
          currentClass: "JSS1",
          session: "2025/2026",
        });
    }
  });

  test("Should paginate students", async () => {
    const response = await request(app)
      .get("/api/v1/students?page=1&limit=5")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.students.length).toBe(5);

    expect(response.body.pagination.currentPage).toBe(1);

    expect(response.body.pagination.totalStudents).toBe(12);
  });
});

