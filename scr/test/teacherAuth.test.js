const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");

const Teacher = require("../models/Teacher");
const Admin = require("../models/Admin");

const generateToken = require("../utils/generateToken");

describe("TEACHER AUTHENTICATION API", () => {
  let teacher;
  let temporaryPassword;

  beforeEach(async () => {
    temporaryPassword = "Temporary123!";

    teacher = await Teacher.create({
      fullName: "John Teacher",
      email: "john.teacher@test.com",
      password: temporaryPassword,
      mustChangePassword: true,
      isActive: true,
    });
  });

  const passwordChangeAuth = (token) => ({
    Authorization: `Bearer ${token}`,
  });

  const login = async (
    email = "john.teacher@test.com",
    password = temporaryPassword,
  ) => {
    return request(app).post("/api/v1/teacher/login").send({
      email,
      password,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | TEACHER LOGIN
  |--------------------------------------------------------------------------
  */

  describe("POST /api/v1/teacher/login", () => {
    test("requires email and password", async () => {
      const response = await request(app)
        .post("/api/v1/teacher/login")
        .send({});

      expect(response.statusCode).toBe(400);
    });

    test("returns a password-change token for first login", async () => {
      const response = await login("JOHN.TEACHER@TEST.COM");

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.requiresPasswordChange).toBe(true);

      expect(response.body.passwordChangeToken).toBeTruthy();
      expect(response.body.token).toBeUndefined();

      expect(response.body.teacher.email).toBe("john.teacher@test.com");
      expect(response.body.teacher.password).toBeUndefined();

      const decoded = jwt.verify(
        response.body.passwordChangeToken,
        process.env.JWT_SECRET,
      );

      expect(decoded.type).toBe("teacher_password_change");
      expect(decoded.id).toBe(teacher._id.toString());
    });

    test("rejects an incorrect password", async () => {
      const response = await login(
        "john.teacher@test.com",
        "WrongPassword123!",
      );

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("rejects an inactive teacher account", async () => {
      teacher.isActive = false;
      await teacher.save();

      const response = await login();

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe("This teacher account is inactive.");
    });

    test("returns a normal access token after password change", async () => {
      teacher.mustChangePassword = false;
      await teacher.save();

      const response = await login();

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.requiresPasswordChange).toBe(false);
      expect(response.body.token).toBeTruthy();
      expect(response.body.passwordChangeToken).toBeUndefined();

      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);

      expect(decoded.type).toBe("teacher");
      expect(decoded.id).toBe(teacher._id.toString());
    });
  });

  /*
  |--------------------------------------------------------------------------
  | FIRST-LOGIN PASSWORD CHANGE
  |--------------------------------------------------------------------------
  */

  describe("PATCH /api/v1/teacher/change-password", () => {
    test("allows first-login password change without current password", async () => {
      const loginResponse = await login();

      const passwordChangeToken = loginResponse.body.passwordChangeToken;

      const response = await request(app)
        .patch("/api/v1/teacher/change-password")
        .set(passwordChangeAuth(passwordChangeToken))
        .send({
          newPassword: "NewTeacher123!",
          confirmPassword: "NewTeacher123!",
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.requiresPasswordChange).toBe(false);
      expect(response.body.token).toBeTruthy();

      const updatedTeacher = await Teacher.findById(teacher._id).select(
        "+password",
      );

      expect(updatedTeacher.mustChangePassword).toBe(false);
      expect(updatedTeacher.tokenVersion).toBe(1);

      expect(await updatedTeacher.comparePassword("NewTeacher123!")).toBe(true);

      expect(await updatedTeacher.comparePassword(temporaryPassword)).toBe(
        false,
      );

      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);

      expect(decoded.type).toBe("teacher");
      expect(decoded.tokenVersion).toBe(1);
    });

    test("rejects a weak password", async () => {
      const loginResponse = await login();

      const response = await request(app)
        .patch("/api/v1/teacher/change-password")
        .set(passwordChangeAuth(loginResponse.body.passwordChangeToken))
        .send({
          newPassword: "weak",
          confirmPassword: "weak",
        });

      expect(response.statusCode).toBe(400);
    });

    test("rejects mismatched password confirmation", async () => {
      const loginResponse = await login();

      const response = await request(app)
        .patch("/api/v1/teacher/change-password")
        .set(passwordChangeAuth(loginResponse.body.passwordChangeToken))
        .send({
          newPassword: "NewTeacher123!",
          confirmPassword: "DifferentTeacher123!",
        });

      expect(response.statusCode).toBe(400);
    });

    test("rejects reuse of the temporary password", async () => {
      const loginResponse = await login();

      const response = await request(app)
        .patch("/api/v1/teacher/change-password")
        .set(passwordChangeAuth(loginResponse.body.passwordChangeToken))
        .send({
          newPassword: temporaryPassword,
          confirmPassword: temporaryPassword,
        });

      expect(response.statusCode).toBe(400);
    });

    test("rejects reuse of a password-change token", async () => {
      const loginResponse = await login();

      const passwordChangeToken = loginResponse.body.passwordChangeToken;

      await request(app)
        .patch("/api/v1/teacher/change-password")
        .set(passwordChangeAuth(passwordChangeToken))
        .send({
          newPassword: "NewTeacher123!",
          confirmPassword: "NewTeacher123!",
        });

      const secondResponse = await request(app)
        .patch("/api/v1/teacher/change-password")
        .set(passwordChangeAuth(passwordChangeToken))
        .send({
          newPassword: "AnotherTeacher123!",
          confirmPassword: "AnotherTeacher123!",
        });

      expect(secondResponse.statusCode).toBe(401);
    });

    test("rejects a request without an authentication token", async () => {
      const response = await request(app)
        .patch("/api/v1/teacher/change-password")
        .send({
          newPassword: "NewTeacher123!",
          confirmPassword: "NewTeacher123!",
        });

      expect(response.statusCode).toBe(401);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | NORMAL PASSWORD CHANGE
  |--------------------------------------------------------------------------
  */

  describe("Normal teacher password change", () => {
    test("requires the current password", async () => {
      teacher.mustChangePassword = false;
      await teacher.save();

      const loginResponse = await login();

      const response = await request(app)
        .patch("/api/v1/teacher/change-password")
        .set(passwordChangeAuth(loginResponse.body.token))
        .send({
          newPassword: "NewTeacher123!",
          confirmPassword: "NewTeacher123!",
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("Current password is required.");
    });

    test("rejects an incorrect current password", async () => {
      teacher.mustChangePassword = false;
      await teacher.save();

      const loginResponse = await login();

      const response = await request(app)
        .patch("/api/v1/teacher/change-password")
        .set(passwordChangeAuth(loginResponse.body.token))
        .send({
          currentPassword: "WrongPassword123!",
          newPassword: "NewTeacher123!",
          confirmPassword: "NewTeacher123!",
        });

      expect(response.statusCode).toBe(401);
    });

    test("changes password when current password is correct", async () => {
      teacher.mustChangePassword = false;
      await teacher.save();

      const loginResponse = await login();

      const response = await request(app)
        .patch("/api/v1/teacher/change-password")
        .set(passwordChangeAuth(loginResponse.body.token))
        .send({
          currentPassword: temporaryPassword,
          newPassword: "NewTeacher123!",
          confirmPassword: "NewTeacher123!",
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.token).toBeTruthy();

      const updatedTeacher = await Teacher.findById(teacher._id).select(
        "+password",
      );

      expect(updatedTeacher.tokenVersion).toBe(1);
      expect(updatedTeacher.mustChangePassword).toBe(false);

      expect(await updatedTeacher.comparePassword("NewTeacher123!")).toBe(true);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | TEACHER PROTECTED PROFILE
  |--------------------------------------------------------------------------
  */

  describe("GET /api/v1/teacher/me", () => {
    test("returns the authenticated teacher profile", async () => {
      teacher.mustChangePassword = false;
      await teacher.save();

      const loginResponse = await login();

      const response = await request(app)
        .get("/api/v1/teacher/me")
        .set(passwordChangeAuth(loginResponse.body.token));

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.teacher.email).toBe("john.teacher@test.com");
      expect(response.body.teacher.password).toBeUndefined();
    });

    test("rejects unauthenticated requests", async () => {
      const response = await request(app).get("/api/v1/teacher/me");

      expect(response.statusCode).toBe(401);
    });

    test("rejects a first-login password-change token", async () => {
      const loginResponse = await login();

      const response = await request(app)
        .get("/api/v1/teacher/me")
        .set(passwordChangeAuth(loginResponse.body.passwordChangeToken));

      expect(response.statusCode).toBe(403);
      expect(response.body.requiresPasswordChange).toBe(true);
    });

    test("rejects an admin token", async () => {
      const admin = await Admin.create({
        fullName: "Test Administrator",
        email: "teacher-auth-admin@test.com",
        password: "AdminPassword123!",
        role: "admin",
        permissions: [],
        isActive: true,
      });

      const adminToken = generateToken(admin);

      const response = await request(app)
        .get("/api/v1/teacher/me")
        .set(passwordChangeAuth(adminToken));

      expect(response.statusCode).toBe(401);
    });

    test("rejects a student token", async () => {
      const studentToken = jwt.sign(
        {
          id: teacher._id.toString(),
          type: "student",
          tokenVersion: 0,
        },
        process.env.JWT_SECRET,
        { expiresIn: "15m" },
      );

      const response = await request(app)
        .get("/api/v1/teacher/me")
        .set(passwordChangeAuth(studentToken));

      expect(response.statusCode).toBe(401);
    });

    test("rejects a token after its tokenVersion is invalidated", async () => {
      teacher.mustChangePassword = false;
      await teacher.save();

      const loginResponse = await login();

      teacher.tokenVersion += 1;
      await teacher.save();

      const response = await request(app)
        .get("/api/v1/teacher/me")
        .set(passwordChangeAuth(loginResponse.body.token));

      expect(response.statusCode).toBe(401);
    });

    test("blocks access while password change is required", async () => {
      const loginResponse = await login();

      const firstLoginToken = jwt.sign(
        {
          id: teacher._id.toString(),
          type: "teacher",
          tokenVersion: 0,
        },
        process.env.JWT_SECRET,
        { expiresIn: "15m" },
      );

      const response = await request(app)
        .get("/api/v1/teacher/me")
        .set(passwordChangeAuth(firstLoginToken));

      expect(response.statusCode).toBe(403);
      expect(response.body.requiresPasswordChange).toBe(true);
    });
  });
});
