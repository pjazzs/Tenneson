const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let token;


beforeEach(async () => {

  const hashedPassword = await bcrypt.hash(
    "password123",
    10
  );

  await Admin.create({
    fullName: "Security Admin",
    email: "security@test.com",
    password: hashedPassword,
    role: "admin",
  });


  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "security@test.com",
      password: "password123",
    });


  token = login.body.token;

});


describe("Security Tests", () => {


test("Should reject tampered JWT token", async () => {

  const fakeToken = token.slice(0, -5) + "xxxxx";


  const response = await request(app)
    .get("/api/v1/students")
    .set(
      "Authorization",
      `Bearer ${fakeToken}`
    );


  expect(response.statusCode).toBe(401);


});


});

test("Should reject expired JWT token", async () => {

  const expiredToken = jwt.sign(
    {
      id: "123456789",
      role: "admin",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "-1s",
    }
  );


  const response = await request(app)
    .get("/api/v1/students")
    .set(
      "Authorization",
      `Bearer ${expiredToken}`
    );


  expect(response.statusCode).toBe(401);

});

test("Should prevent normal admin from creating another admin", async () => {

  const response = await request(app)
    .post("/api/v1/auth/register")
    .set(
      "Authorization",
      `Bearer ${token}`
    )
    .send({
      fullName: "Another Admin",
      email: "another@test.com",
      password: "password123",
      role: "admin"
    });


  expect(response.statusCode).toBe(403);

});