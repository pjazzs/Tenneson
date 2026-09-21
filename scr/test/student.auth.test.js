const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = require("../app");

const Admin = require("../models/Admin");
const Student = require("../models/student");
const StudentCredential = require("../models/StudentCredential");
const generateToken = require("../utils/generateToken");

describe("Student Authentication API", () => {
  let admin;
  let adminToken;
  let student;

  const adminPassword = "AdminPassword123!";

  const studentPassword = "StudentPassword123!";
  const newStudentPassword = "NewStudentPassword123!";

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

    student = await Student.create({
      studentId: "TCC00001",
      firstName: "John",
      lastName: "Doe",
      otherName: "",
      gender: "Male",
      dateOfBirth: new Date("2012-01-15"),
      currentClass: "JSS1",
      session: "2025/2026",
      parentName: "Jane Doe",
      parentPhone: "08012345678",
      isActive: true,
    });
  });

  describe("POST /api/v1/students/:studentId/credentials", () => {
    test("Should create a student credential successfully", async () => {
      const response = await request(app)
        .post(`/api/v1/students/${student.studentId}/credentials`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          password: studentPassword,
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.studentCredential.username).toBe(student.studentId);

      expect(response.body.studentCredential.mustChangePassword).toBe(true);

      expect(response.body.studentCredential.temporaryPassword).toBe(
        studentPassword,
      );

      const credential = await StudentCredential.findOne({
        student: student._id,
      });

      expect(credential).not.toBeNull();
      expect(credential.username).toBe("TCC00001");
      expect(credential.passwordHash).not.toBe(studentPassword);

      const passwordMatches = await bcrypt.compare(
        studentPassword,
        credential.passwordHash,
      );

      expect(passwordMatches).toBe(true);
    });

    test("Should reject credential creation without admin authentication", async () => {
      const response = await request(app)
        .post(`/api/v1/students/${student.studentId}/credentials`)
        .send({
          password: studentPassword,
        });

      expect(response.statusCode).toBe(401);
    });

    test("Should reject duplicate student credential", async () => {
      await StudentCredential.create({
        student: student._id,
        username: student.studentId,
        passwordHash: await bcrypt.hash(studentPassword, 12),
        mustChangePassword: true,
        isActive: true,
        createdBy: admin._id,
      });

      const response = await request(app)
        .post(`/api/v1/students/${student.studentId}/credentials`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          password: studentPassword,
        });

      expect(response.statusCode).toBe(409);
    });
  });

  describe("POST /api/v1/student/login", () => {
    beforeEach(async () => {
      await StudentCredential.create({
        student: student._id,
        username: student.studentId,
        passwordHash: await bcrypt.hash(studentPassword, 12),
        mustChangePassword: true,
        isActive: true,
        createdBy: admin._id,
      });
    });

    test("Should login successfully and require first password change", async () => {
      // existing test
    });

    test("Should reject login with incorrect password", async () => {
      // existing test
    });

    test("Should reject login for a nonexistent student", async () => {
      // existing test
    });

    test("Should reject login for an archived student", async () => {
      // existing test
    });

    test("Should reject reuse of a password-change token after successful password change", async () => {
      const loginResponse = await request(app)
        .post("/api/v1/student/login")
        .send({
          username: student.studentId,
          password: studentPassword,
        });

      expect(loginResponse.statusCode).toBe(200);
      expect(loginResponse.body.passwordChangeToken).toBeDefined();

      const passwordChangeToken = loginResponse.body.passwordChangeToken;

      // First password change should succeed
      const firstChangeResponse = await request(app)
        .patch("/api/v1/student/change-password")
        .set("Authorization", `Bearer ${passwordChangeToken}`)
        .send({
          newPassword: newStudentPassword,
          confirmPassword: newStudentPassword,
        });

      expect(firstChangeResponse.statusCode).toBe(200);
      expect(firstChangeResponse.body.success).toBe(true);

      // The same password-change token must now be invalid
      const reuseResponse = await request(app)
        .patch("/api/v1/student/change-password")
        .set("Authorization", `Bearer ${passwordChangeToken}`)
        .send({
          newPassword: "AnotherStudentPassword123!",
          confirmPassword: "AnotherStudentPassword123!",
        });

      expect(reuseResponse.statusCode).toBe(401);
      expect(reuseResponse.body.success).toBe(false);
    });
  });

  describe("PATCH /api/v1/student/change-password", () => {
    test("Should change the first-login password successfully", async () => {
      await StudentCredential.create({
        student: student._id,
        username: student.studentId,
        passwordHash: await bcrypt.hash(studentPassword, 12),
        mustChangePassword: true,
        isActive: true,
        createdBy: admin._id,
      });

      const loginResponse = await request(app)
        .post("/api/v1/student/login")
        .send({
          username: student.studentId,
          password: studentPassword,
        });

      expect(loginResponse.statusCode).toBe(200);
      expect(loginResponse.body.passwordChangeToken).toBeDefined();

      const passwordChangeToken = loginResponse.body.passwordChangeToken;

      const response = await request(app)
        .patch("/api/v1/student/change-password")
        .set("Authorization", `Bearer ${passwordChangeToken}`)
        .send({
          newPassword: newStudentPassword,
          confirmPassword: newStudentPassword,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();

      const credential = await StudentCredential.findOne({
        student: student._id,
      });

      expect(credential.mustChangePassword).toBe(false);
      expect(credential.passwordChangedAt).not.toBeNull();

      const passwordMatches = await bcrypt.compare(
        newStudentPassword,
        credential.passwordHash,
      );

      expect(passwordMatches).toBe(true);
    });

    test("Should reject a weak new password", async () => {
      await StudentCredential.create({
        student: student._id,
        username: student.studentId,
        passwordHash: await bcrypt.hash(studentPassword, 12),
        mustChangePassword: true,
        isActive: true,
        createdBy: admin._id,
      });

      const loginResponse = await request(app)
        .post("/api/v1/student/login")
        .send({
          username: student.studentId,
          password: studentPassword,
        });

      const response = await request(app)
        .patch("/api/v1/student/change-password")
        .set(
          "Authorization",
          `Bearer ${loginResponse.body.passwordChangeToken}`,
        )
        .send({
          newPassword: "123456",
          confirmPassword: "123456",
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  test("Should invalidate an old access token after the student changes password", async () => {
    await StudentCredential.create({
      student: student._id,
      username: student.studentId,
      passwordHash: await bcrypt.hash(studentPassword, 12),
      mustChangePassword: false,
      isActive: true,
      createdBy: admin._id,
    });

    // Get a normal access token before changing the password
    const loginResponse = await request(app)
      .post("/api/v1/student/login")
      .send({
        username: student.studentId,
        password: studentPassword,
      });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    const oldToken = loginResponse.body.token;

    // Change the password using the old token
    const changePasswordResponse = await request(app)
      .patch("/api/v1/student/change-password")
      .set("Authorization", `Bearer ${oldToken}`)
      .send({
        currentPassword: studentPassword,
        newPassword: newStudentPassword,
        confirmPassword: newStudentPassword,
      });

    expect(changePasswordResponse.statusCode).toBe(200);
    expect(changePasswordResponse.body.token).toBeDefined();

    const newToken = changePasswordResponse.body.token;

    // Old token should no longer be accepted
    const oldTokenResponse = await request(app)
      .get("/api/v1/student/me")
      .set("Authorization", `Bearer ${oldToken}`);

    expect(oldTokenResponse.statusCode).toBe(401);

    // Fresh token should still work
    const newTokenResponse = await request(app)
      .get("/api/v1/student/me")
      .set("Authorization", `Bearer ${newToken}`);

    console.log("NEW TOKEN STATUS:", newTokenResponse.statusCode);
    console.log("NEW TOKEN RESPONSE:", newTokenResponse.body);

    const decodedNewToken = jwt.decode(newToken);

    const credentialAfterChange = await StudentCredential.findOne({
      student: student._id,
    });

    const passwordChangedAtSeconds = credentialAfterChange?.passwordChangedAt
      ? Math.floor(credentialAfterChange.passwordChangedAt.getTime() / 1000)
      : null;

    console.log("NEW TOKEN IAT:", decodedNewToken?.iat);
    console.log(
      "PASSWORD CHANGED AT:",
      credentialAfterChange?.passwordChangedAt,
    );
    console.log("PASSWORD CHANGED AT SECONDS:", passwordChangedAtSeconds);

    expect(newTokenResponse.statusCode).toBe(200);
  });

  describe("GET /api/v1/student/me", () => {
    test("Should return the authenticated student's profile", async () => {
      await StudentCredential.create({
        student: student._id,
        username: student.studentId,
        passwordHash: await bcrypt.hash(newStudentPassword, 12),
        mustChangePassword: false,
        isActive: true,
        createdBy: admin._id,
      });

      const loginResponse = await request(app)
        .post("/api/v1/student/login")
        .send({
          username: student.studentId,
          password: newStudentPassword,
        });

      expect(loginResponse.statusCode).toBe(200);
      expect(loginResponse.body.token).toBeDefined();

      const response = await request(app)
        .get("/api/v1/student/me")
        .set("Authorization", `Bearer ${loginResponse.body.token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.student.studentId).toBe(student.studentId);

      expect(response.body.student.firstName).toBe("John");
      expect(response.body.student.lastName).toBe("Doe");
    });

    test("Should reject access without student authentication", async () => {
      const response = await request(app).get("/api/v1/student/me");

      expect(response.statusCode).toBe(401);
    });

    test("Should reject access when the student must change password", async () => {
      await StudentCredential.create({
        student: student._id,
        username: student.studentId,
        passwordHash: await bcrypt.hash(studentPassword, 12),
        mustChangePassword: true,
        isActive: true,
        createdBy: admin._id,
      });

      const loginResponse = await request(app)
        .post("/api/v1/student/login")
        .send({
          username: student.studentId,
          password: studentPassword,
        });

      const response = await request(app)
        .get("/api/v1/student/me")
        .set(
          "Authorization",
          `Bearer ${loginResponse.body.passwordChangeToken}`,
        );

      expect(response.statusCode).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.requiresPasswordChange).toBe(true);
    });
  });

  describe("PATCH /api/v1/students/:studentId/reset-password", () => {
    test("Should allow an authorized admin to reset a student's password", async () => {
      await StudentCredential.create({
        student: student._id,
        username: student.studentId,
        passwordHash: await bcrypt.hash(studentPassword, 12),
        mustChangePassword: false,
        isActive: true,
        createdBy: admin._id,
      });

      const response = await request(app)
        .patch(`/api/v1/students/${student.studentId}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          password: newStudentPassword,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.studentCredential.mustChangePassword).toBe(true);

      const credential = await StudentCredential.findOne({
        student: student._id,
      });

      expect(credential.mustChangePassword).toBe(true);

      const passwordMatches = await bcrypt.compare(
        newStudentPassword,
        credential.passwordHash,
      );

      expect(passwordMatches).toBe(true);
    });

    test("Should require password change after admin resets a student's password", async () => {
      await StudentCredential.create({
        student: student._id,
        username: student.studentId,
        passwordHash: await bcrypt.hash(studentPassword, 12),
        mustChangePassword: false,
        isActive: true,
        createdBy: admin._id,
      });

      // Admin resets the student's password
      const resetResponse = await request(app)
        .patch(`/api/v1/students/${student.studentId}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          password: newStudentPassword,
        });

      expect(resetResponse.statusCode).toBe(200);
      expect(resetResponse.body.success).toBe(true);

      // Student logs in with the newly reset password
      const loginResponse = await request(app)
        .post("/api/v1/student/login")
        .send({
          username: student.studentId,
          password: newStudentPassword,
        });

      expect(loginResponse.statusCode).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.requiresPasswordChange).toBe(true);

      expect(loginResponse.body.passwordChangeToken).toBeDefined();
      expect(loginResponse.body.token).toBeUndefined();

      // The temporary/password-change token must not access the profile yet
      const profileResponse = await request(app)
        .get("/api/v1/student/me")
        .set(
          "Authorization",
          `Bearer ${loginResponse.body.passwordChangeToken}`,
        );

      expect(profileResponse.statusCode).toBe(403);
      expect(profileResponse.body.success).toBe(false);
      expect(profileResponse.body.requiresPasswordChange).toBe(true);
    });

    test("Should reject a valid student token when the credential is inactive", async () => {
      await StudentCredential.create({
        student: student._id,
        username: student.studentId,
        passwordHash: await bcrypt.hash(newStudentPassword, 12),
        mustChangePassword: false,
        isActive: true,
        createdBy: admin._id,
      });

      const loginResponse = await request(app)
        .post("/api/v1/student/login")
        .send({
          username: student.studentId,
          password: newStudentPassword,
        });

      expect(loginResponse.statusCode).toBe(200);
      expect(loginResponse.body.token).toBeDefined();

      const token = loginResponse.body.token;

      // Deactivate the credential after the token has already been issued.
      await StudentCredential.updateOne(
        { student: student._id },
        {
          $set: {
            isActive: false,
          },
        },
      );

      const response = await request(app)
        .get("/api/v1/student/me")
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("Should reject a valid student token when the student is inactive", async () => {
      await StudentCredential.create({
        student: student._id,
        username: student.studentId,
        passwordHash: await bcrypt.hash(newStudentPassword, 12),
        mustChangePassword: false,
        isActive: true,
        createdBy: admin._id,
      });

      const loginResponse = await request(app)
        .post("/api/v1/student/login")
        .send({
          username: student.studentId,
          password: newStudentPassword,
        });

      expect(loginResponse.statusCode).toBe(200);
      expect(loginResponse.body.token).toBeDefined();

      const token = loginResponse.body.token;

      // Deactivate the student after the JWT has already been issued.
      await Student.updateOne(
        { _id: student._id },
        {
          $set: {
            isActive: false,
          },
        },
      );

      const response = await request(app)
        .get("/api/v1/student/me")
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("Should invalidate an old access token after an admin resets the student's password", async () => {
      await StudentCredential.create({
        student: student._id,
        username: student.studentId,
        passwordHash: await bcrypt.hash(studentPassword, 12),
        mustChangePassword: false,
        isActive: true,
        createdBy: admin._id,
      });

      // Login before the admin resets the password
      const loginResponse = await request(app)
        .post("/api/v1/student/login")
        .send({
          username: student.studentId,
          password: studentPassword,
        });

      expect(loginResponse.statusCode).toBe(200);
      expect(loginResponse.body.token).toBeDefined();

      const oldToken = loginResponse.body.token;

      // Admin resets the student's password
      const resetResponse = await request(app)
        .patch(`/api/v1/students/${student.studentId}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          password: newStudentPassword,
        });

      expect(resetResponse.statusCode).toBe(200);
      expect(resetResponse.body.success).toBe(true);

      // The old token must no longer be usable
      const oldTokenResponse = await request(app)
        .get("/api/v1/student/me")
        .set("Authorization", `Bearer ${oldToken}`);

      expect(oldTokenResponse.statusCode).toBe(401);
    });

    test("Should reject password reset without admin authentication", async () => {
      const response = await request(app)
        .patch(`/api/v1/students/${student.studentId}/reset-password`)
        .send({
          password: newStudentPassword,
        });

      expect(response.statusCode).toBe(401);
    });
  });
});
