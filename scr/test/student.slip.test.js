const request = require("supertest");
const app = require("../app");
const bcrypt = require("bcrypt");

let token;
let studentId;
let superAdminToken;
describe("Student Slip PDF", () => {

beforeEach(async () => {
  const Admin = require("../models/Admin");

  await Admin.deleteMany({});

  const hashedPassword = await bcrypt.hash("password123", 10);

  await Admin.create({
    fullName: "Super Admin",
    email: "superadmin@test.com",
    password: hashedPassword,
    role: "super_admin",
  });

  const superLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "superadmin@test.com",
      password: "password123",
    });

  superAdminToken = superLogin.body.token;

  const student = await request(app)
  .post("/api/v1/students")
  .set("Authorization", `Bearer ${superAdminToken}`)
  .send({
    firstName: "John",
    lastName: "Doe",
    gender: "Male",
    dateOfBirth: "2012-05-20",
    currentClass: "JSS1",
    session: "2026/2027",
    parentName: "Mr Doe",
    parentPhone: "08012345678",
  });


expect(student.statusCode).toBe(201);

studentId = student.body.student.studentId;
token = superAdminToken;
});


  test("Should download student registration slip PDF", async () => {

    const response = await request(app)
      .get(`/api/v1/students/${studentId}/slip`)
      .set("Authorization", `Bearer ${token}`);


    expect(response.statusCode).toBe(200);

    expect(response.headers["content-type"])
      .toContain("application/pdf");

  });

});