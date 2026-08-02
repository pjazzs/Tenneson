const request = require("supertest");
const app = require("../app");
const setupAdmin = require("./helpers/setupAdmin");
const Student = require("../models/student");

let token;

beforeEach(async () => {
  token = await setupAdmin();

  await Student.create({
    studentId: "TCC00001",
    firstName: "John",
    lastName: "Doe",
    gender: "Male",
    dateOfBirth: new Date("2012-05-10"),
    currentClass: "JSS1",
    session: "2025/2026",
    isActive: true,
    parentName: "Mr Doe",
    parentPhone: "08012345678",
  });

  const check = await Student.findOne({
    studentId: "TCC00001"
  });

  console.log("CREATED STUDENT:", check);
});

describe("Verify Student", () => {

  test("Should verify an existing student", async () => {

    const response = await request(app)
      .get("/api/v1/students/verify/TCC00001")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.verified).toBe(true);

    expect(response.body.student.studentId).toBe("TCC00001");

  });


  test("Should return 404 for non-existing student", async () => {

    const response = await request(app)
      .get("/api/v1/students/verify/TCC99999")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);

    expect(response.body.exists).toBe(false);

  });


  test("Should not verify archived student", async () => {

    await Student.updateOne(
      { studentId: "TCC00001" },
      { isActive: false }
    );

    const response = await request(app)
      .get("/api/v1/students/verify/TCC00001")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);

    expect(response.body.verified).toBe(false);

  });

});