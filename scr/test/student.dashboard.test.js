const request = require("supertest");
const app = require("../app");
const setupAdmin = require("./helpers/setupAdmin");
const Student = require("../models/student");

let token;


beforeEach(async () => {
  token = await setupAdmin();

  await Student.create([
    {
      studentId: "TCC00001",
      firstName: "John",
      lastName: "Doe",
      gender: "Male",
      dateOfBirth: new Date("2012-05-10"),
      currentClass: "JSS1",
      session: "2025/2026",
      isActive: true,
    },
    {
      studentId: "TCC00002",
      firstName: "Jane",
      lastName: "Doe",
      gender: "Female",
      dateOfBirth: new Date("2011-06-15"),
      currentClass: "JSS2",
      session: "2025/2026",
      isActive: true,
    },
    {
      studentId: "TCC00003",
      firstName: "Peter",
      lastName: "Smith",
      gender: "Male",
      dateOfBirth: new Date("2010-03-20"),
      currentClass: "JSS3",
      session: "2025/2026",
      isActive: true,
    },
  ]);
});


describe("Student Dashboard", () => {

  test("Should return dashboard statistics", async () => {

    const response = await request(app)
      .get("/api/v1/students/dashboard")
      .set("Authorization", `Bearer ${token}`);


    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.totalStudents)
      .toBe(3);

   expect(response.body.data.activeStudents)
  .toBe(3);

expect(response.body.data.inactiveStudents)
  .toBe(0);
    expect(response.body.data.maleStudents)
      .toBe(2);

    expect(response.body.data.femaleStudents)
      .toBe(1);

  });


  test("Should reject dashboard without token", async () => {

    const response = await request(app)
      .get("/api/v1/students/dashboard");


    expect(response.statusCode).toBe(401);

  });

});