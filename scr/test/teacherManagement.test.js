const request = require("supertest");

const app = require("../app");

const Admin = require("../models/Admin");
const Teacher = require("../models/Teacher");

const generateToken = require("../utils/generateToken");

describe("TEACHER MANAGEMENT API", () => {
  let admin;
  let token;

  beforeEach(async () => {
    admin = await Admin.create({
      fullName: "Test Administrator",
      email: "teacher-admin@test.com",
      password: "Password123!",
      role: "admin",
      permissions: [
        "teachers.create",
        "teachers.view",
        "teachers.update",
        "teachers.password-reset",
      ],
      isActive: true,
    });

    token = generateToken(admin);
  });

  const auth = () => ({
    Authorization: `Bearer ${token}`,
  });

  const createTeacher = async (overrides = {}) => {
    return Teacher.create({
      fullName: "John Teacher",
      email: "john.teacher@test.com",
      password: "OriginalPassword123!",
      ...overrides,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE TEACHER
  |--------------------------------------------------------------------------
  */

  describe("POST /api/v1/teachers", () => {
    test("creates a teacher and returns temporary credentials", async () => {
      const response = await request(app)
        .post("/api/v1/teachers")
        .set(auth())
        .send({
          fullName: "Jane Teacher",
          email: "JANE.TEACHER@TEST.COM",
          phone: "08012345678",
          employeeId: "tch001",
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.teacher.fullName).toBe("Jane Teacher");
      expect(response.body.teacher.email).toBe("jane.teacher@test.com");
      expect(response.body.teacher.employeeId).toBe("TCH001");

      expect(response.body.teacher.password).toBeUndefined();

      expect(response.body.credentials.email).toBe("jane.teacher@test.com");

      expect(response.body.credentials.temporaryPassword).toBeTruthy();
      expect(response.body.credentials.mustChangePassword).toBe(true);

      const savedTeacher = await Teacher.findOne({
        email: "jane.teacher@test.com",
      }).select("+password");

      expect(savedTeacher).toBeTruthy();
      expect(savedTeacher.password).not.toBe(
        response.body.credentials.temporaryPassword,
      );

      expect(
        await savedTeacher.comparePassword(
          response.body.credentials.temporaryPassword,
        ),
      ).toBe(true);

      expect(savedTeacher.mustChangePassword).toBe(true);
    });

    test("rejects creation without a full name", async () => {
      const response = await request(app)
        .post("/api/v1/teachers")
        .set(auth())
        .send({
          email: "missing.name@test.com",
        });

      expect(response.statusCode).toBe(400);
    });

    test("rejects creation without an email", async () => {
      const response = await request(app)
        .post("/api/v1/teachers")
        .set(auth())
        .send({
          fullName: "Missing Email",
        });

      expect(response.statusCode).toBe(400);
    });

    test("rejects duplicate email addresses", async () => {
      await createTeacher();

      const response = await request(app)
        .post("/api/v1/teachers")
        .set(auth())
        .send({
          fullName: "Another Teacher",
          email: "JOHN.TEACHER@TEST.COM",
        });

      expect(response.statusCode).toBe(409);
    });

    test("rejects duplicate employee IDs", async () => {
      await createTeacher({
        employeeId: "TCH010",
      });

      const response = await request(app)
        .post("/api/v1/teachers")
        .set(auth())
        .send({
          fullName: "Another Teacher",
          email: "another.teacher@test.com",
          employeeId: "tch010",
        });

      expect(response.statusCode).toBe(409);
    });

    test("does not allow unauthenticated creation", async () => {
      const response = await request(app).post("/api/v1/teachers").send({
        fullName: "Unauthenticated Teacher",
        email: "unauthenticated@test.com",
      });

      expect(response.statusCode).toBe(401);
    });

    test("rejects an admin without teachers.create permission", async () => {
      const restrictedAdmin = await Admin.create({
        fullName: "Restricted Admin",
        email: "restricted@test.com",
        password: "Password123!",
        role: "admin",
        permissions: [],
      });

      const restrictedToken = generateToken(restrictedAdmin);

      const response = await request(app)
        .post("/api/v1/teachers")
        .set("Authorization", `Bearer ${restrictedToken}`)
        .send({
          fullName: "Restricted Creation",
          email: "restricted.teacher@test.com",
        });

      expect(response.statusCode).toBe(403);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | GET TEACHERS
  |--------------------------------------------------------------------------
  */

  describe("GET /api/v1/teachers", () => {
    test("returns active teachers by default", async () => {
      await createTeacher();

      await createTeacher({
        fullName: "Inactive Teacher",
        email: "inactive@test.com",
        isActive: false,
      });

      const response = await request(app).get("/api/v1/teachers").set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.teachers).toHaveLength(1);
      expect(response.body.teachers[0].email).toBe("john.teacher@test.com");

      expect(response.body.teachers[0].password).toBeUndefined();
    });

    test("returns inactive teachers when status=inactive", async () => {
      await createTeacher({
        isActive: false,
      });

      const response = await request(app)
        .get("/api/v1/teachers?status=inactive")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.teachers).toHaveLength(1);
      expect(response.body.teachers[0].isActive).toBe(false);
    });

    test("returns all teachers when status=all", async () => {
      await createTeacher();

      await createTeacher({
        fullName: "Inactive Teacher",
        email: "inactive@test.com",
        isActive: false,
      });

      const response = await request(app)
        .get("/api/v1/teachers?status=all")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.teachers).toHaveLength(2);
    });

    test("searches teachers by name, email, employee ID and phone", async () => {
      await createTeacher({
        employeeId: "TCH500",
        phone: "08055555555",
      });

      const response = await request(app)
        .get("/api/v1/teachers?search=TCH500")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.teachers).toHaveLength(1);
      expect(response.body.teachers[0].employeeId).toBe("TCH500");
    });

    test("supports pagination", async () => {
      await createTeacher({
        email: "one@test.com",
      });

      await createTeacher({
        fullName: "Second Teacher",
        email: "two@test.com",
      });

      await createTeacher({
        fullName: "Third Teacher",
        email: "three@test.com",
      });

      const response = await request(app)
        .get("/api/v1/teachers?page=1&limit=2")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.teachers).toHaveLength(2);

      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.totalTeachers).toBe(3);
      expect(response.body.pagination.totalPages).toBe(2);
    });

    test("rejects an invalid status filter", async () => {
      const response = await request(app)
        .get("/api/v1/teachers?status=deleted")
        .set(auth());

      expect(response.statusCode).toBe(400);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | GET SINGLE TEACHER
  |--------------------------------------------------------------------------
  */

  describe("GET /api/v1/teachers/:id", () => {
    test("returns a teacher by ID", async () => {
      const teacher = await createTeacher();

      const response = await request(app)
        .get(`/api/v1/teachers/${teacher._id}`)
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.teacher.email).toBe("john.teacher@test.com");

      expect(response.body.teacher.password).toBeUndefined();
    });

    test("returns 404 for a nonexistent teacher", async () => {
      const response = await request(app)
        .get("/api/v1/teachers/68c123456789abcdef123456")
        .set(auth());

      expect(response.statusCode).toBe(404);
    });

    test("rejects an invalid teacher ID", async () => {
      const response = await request(app)
        .get("/api/v1/teachers/invalid-id")
        .set(auth());

      expect(response.statusCode).toBe(400);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | UPDATE TEACHER
  |--------------------------------------------------------------------------
  */

  describe("PATCH /api/v1/teachers/:id", () => {
    test("updates teacher profile details", async () => {
      const teacher = await createTeacher();

      const response = await request(app)
        .patch(`/api/v1/teachers/${teacher._id}`)
        .set(auth())
        .send({
          fullName: "John Updated",
          phone: "08099999999",
          employeeId: "TCH999",
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.teacher.fullName).toBe("John Updated");
      expect(response.body.teacher.phone).toBe("08099999999");
      expect(response.body.teacher.employeeId).toBe("TCH999");
    });

    test("normalizes email when updated", async () => {
      const teacher = await createTeacher();

      const response = await request(app)
        .patch(`/api/v1/teachers/${teacher._id}`)
        .set(auth())
        .send({
          email: "UPDATED@TEST.COM",
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.teacher.email).toBe("updated@test.com");
    });

    test("rejects duplicate email updates", async () => {
      await createTeacher({
        email: "first@test.com",
      });

      const second = await createTeacher({
        fullName: "Second Teacher",
        email: "second@test.com",
      });

      const response = await request(app)
        .patch(`/api/v1/teachers/${second._id}`)
        .set(auth())
        .send({
          email: "first@test.com",
        });

      expect(response.statusCode).toBe(409);
    });

    test("does not allow password or status changes through profile update", async () => {
      const teacher = await createTeacher();

      const response = await request(app)
        .patch(`/api/v1/teachers/${teacher._id}`)
        .set(auth())
        .send({
          fullName: "Safe Update",
          password: "AttackerPassword123!",
          isActive: false,
          tokenVersion: 100,
          mustChangePassword: false,
        });

      expect(response.statusCode).toBe(200);

      const savedTeacher = await Teacher.findById(teacher._id).select(
        "+password",
      );

      expect(savedTeacher.fullName).toBe("Safe Update");
      expect(savedTeacher.isActive).toBe(true);
      expect(savedTeacher.tokenVersion).toBe(0);
      expect(savedTeacher.mustChangePassword).toBe(true);

      expect(await savedTeacher.comparePassword("AttackerPassword123!")).toBe(
        false,
      );
    });

    test("rejects an empty update", async () => {
      const teacher = await createTeacher();

      const response = await request(app)
        .patch(`/api/v1/teachers/${teacher._id}`)
        .set(auth())
        .send({
          password: "IgnoredPassword123!",
        });

      expect(response.statusCode).toBe(400);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | ACTIVATE / DEACTIVATE TEACHER
  |--------------------------------------------------------------------------
  */

  describe("PATCH /api/v1/teachers/:id/status", () => {
    test("deactivates a teacher and increments token version", async () => {
      const teacher = await createTeacher();

      const response = await request(app)
        .patch(`/api/v1/teachers/${teacher._id}/status`)
        .set(auth())
        .send({
          isActive: false,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.teacher.isActive).toBe(false);
      expect(response.body.teacher.tokenVersion).toBe(1);

      const savedTeacher = await Teacher.findById(teacher._id);

      expect(savedTeacher.isActive).toBe(false);
      expect(savedTeacher.tokenVersion).toBe(1);
    });

    test("reactivates a teacher", async () => {
      const teacher = await createTeacher({
        isActive: false,
        tokenVersion: 1,
      });

      const response = await request(app)
        .patch(`/api/v1/teachers/${teacher._id}/status`)
        .set(auth())
        .send({
          isActive: true,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.teacher.isActive).toBe(true);
      expect(response.body.teacher.tokenVersion).toBe(2);
    });

    test("rejects a non-boolean status value", async () => {
      const teacher = await createTeacher();

      const response = await request(app)
        .patch(`/api/v1/teachers/${teacher._id}/status`)
        .set(auth())
        .send({
          isActive: "false",
        });

      expect(response.statusCode).toBe(400);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | RESET TEACHER PASSWORD
  |--------------------------------------------------------------------------
  */

  describe("PATCH /api/v1/teachers/:id/reset-password", () => {
    test("resets password and requires a password change", async () => {
      const teacher = await createTeacher({
        mustChangePassword: false,
      });

      const response = await request(app)
        .patch(`/api/v1/teachers/${teacher._id}/reset-password`)
        .set(auth())
        .send({});

      expect(response.statusCode).toBe(200);
      expect(response.body.credentials.temporaryPassword).toBeTruthy();
      expect(response.body.credentials.mustChangePassword).toBe(true);

      const savedTeacher = await Teacher.findById(teacher._id).select(
        "+password",
      );

      expect(savedTeacher.mustChangePassword).toBe(true);
      expect(savedTeacher.tokenVersion).toBe(1);

      expect(
        await savedTeacher.comparePassword(
          response.body.credentials.temporaryPassword,
        ),
      ).toBe(true);
    });

    test("does not reset password for an inactive teacher", async () => {
      const teacher = await createTeacher({
        isActive: false,
      });

      const response = await request(app)
        .patch(`/api/v1/teachers/${teacher._id}/reset-password`)
        .set(auth())
        .send({});

      expect(response.statusCode).toBe(400);
    });
  });
});
