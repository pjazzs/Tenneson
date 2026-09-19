const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = require("../app");
const generateToken = require("../utils/generateToken");
const Admin = require("../models/Admin");
const Student = require("../models/student");
const StudentCredential = require("../models/StudentCredential");

describe("Student Duplicate Registration Race Condition", () => {
  let admin;
  let adminToken;

  const adminPassword = "AdminPassword123!";

  const studentPayload = {
    firstName: "John",
    lastName: "Doe",
    otherName: "",
    gender: "Male",
    dateOfBirth: "2012-05-10",
    currentClass: "JSS1",
    session: "2025/2026",
    parentName: "Jane Doe",
    parentPhone: "08012345678",
  };

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    admin = await Admin.create({
      fullName: "Test Super Admin",
      email: "superadmin@test.com",
      password: passwordHash,
      role: "super_admin",
      permissions: [],
    });

    adminToken = generateToken(admin);
  });

  test("should allow only one student when two identical registrations happen concurrently", async () => {
    const [response1, response2] = await Promise.all([
      request(app)
        .post("/api/v1/students")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(studentPayload),

      request(app)
        .post("/api/v1/students")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(studentPayload),
    ]);

    const responses = [response1, response2];

    /*
     * ------------------------------------------------------------------------
     * Verify HTTP results
     * ------------------------------------------------------------------------
     */

    const successfulResponses = responses.filter(
      (response) => response.statusCode === 201,
    );

    const duplicateResponses = responses.filter(
      (response) => response.statusCode === 409,
    );

    expect(successfulResponses).toHaveLength(1);
    expect(duplicateResponses).toHaveLength(1);

    /*
     * ------------------------------------------------------------------------
     * Resolve the successful response
     * ------------------------------------------------------------------------
     */

    const successfulResponse = successfulResponses[0];

    expect(successfulResponse.body.success).toBe(true);
    expect(successfulResponse.body.student).toBeDefined();

    const createdStudentId = successfulResponse.body.student._id;

    expect(createdStudentId).toBeDefined();

    /*
     * ------------------------------------------------------------------------
     * Verify the actual student created by the successful request
     * ------------------------------------------------------------------------
     */

    const createdStudent = await Student.findById(createdStudentId);

    expect(createdStudent).not.toBeNull();

    expect(createdStudent.firstName).toBe("John");
    expect(createdStudent.lastName).toBe("Doe");
    expect(createdStudent.isActive).toBe(true);

    /*
     * ------------------------------------------------------------------------
     * Verify only one active student exists
     * ------------------------------------------------------------------------
     */

    const activeStudents = await Student.find({
      firstName: "John",
      lastName: "Doe",
      isActive: true,
    });

    expect(activeStudents).toHaveLength(1);

    /*
     * ------------------------------------------------------------------------
     * Verify only one credential exists
     * ------------------------------------------------------------------------
     */

    const credentials = await StudentCredential.find({
      student: createdStudent._id,
    });

    expect(credentials).toHaveLength(1);

    /*
     * ------------------------------------------------------------------------
     * Verify the duplicate request did not create another credential
     * ------------------------------------------------------------------------
     */

    const allCredentials = await StudentCredential.find({});

    expect(allCredentials).toHaveLength(1);
  });
});
