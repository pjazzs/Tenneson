const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const StudentCredential = require("../models/StudentCredential");
const bcrypt = require("bcrypt");

describe("Student Archive API", () => {
  let token;
  let studentId;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const adminEmail = `admin${Date.now()}@test.com`;

    await Admin.create({
      fullName: "Test Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      permissions: [
        "students.create",
        "students.view",
        "students.delete",
        "students.restore",
      ],
    });

    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: adminEmail,
      password: "password123",
    });

    token = loginResponse.body.token;

    const studentResponse = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "John",
        lastName: "Doe",
        gender: "Male",
        dateOfBirth: "2012-05-10",
        currentClass: "JSS1",
        session: "2025/2026",
      });

    expect(studentResponse.statusCode).toBe(201);

    studentId = studentResponse.body.student.studentId;
  });

  test("Should archive a student successfully", async () => {
    const response = await request(app)
      .delete(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Student archived successfully");
  });

  test("Should return archived students", async () => {
    await request(app)
      .delete(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .get("/api/v1/students/archived")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.totalStudents).toBeGreaterThan(0);
    expect(Array.isArray(response.body.students)).toBe(true);

    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(20);
    expect(response.body.totalPages).toBe(1);

    const archivedStudent = response.body.students.find(
      (student) => student.studentId === studentId,
    );

    expect(archivedStudent).toBeDefined();
    expect(archivedStudent.isActive).toBe(false);
  });

  test("Should not include archived student in active students", async () => {
    await request(app)
      .delete(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .get("/api/v1/students")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const archivedStudent = response.body.students.find(
      (student) => student.studentId === studentId,
    );

    expect(archivedStudent).toBeUndefined();
  });

  test("Should restore an archived student successfully", async () => {
    await request(app)
      .delete(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .patch(`/api/v1/students/${studentId}/restore`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Student restored successfully");
  });

  test("Should return 404 when restoring non-existing student", async () => {
    const response = await request(app)
      .patch("/api/v1/students/TCC99999/restore")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test("Should deactivate student credential when archiving a student", async () => {
    const credentialBeforeArchive = await StudentCredential.findOne({
      username: studentId,
    });

    expect(credentialBeforeArchive).not.toBeNull();
    expect(credentialBeforeArchive.isActive).toBe(true);

    const response = await request(app)
      .delete(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    const credentialAfterArchive = await StudentCredential.findOne({
      username: studentId,
    });

    expect(credentialAfterArchive).not.toBeNull();
    expect(credentialAfterArchive.isActive).toBe(false);
  });

  test("Should paginate archived students", async () => {
    const studentsToCreate = 25;

    for (let i = 1; i <= studentsToCreate; i++) {
      const response = await request(app)
        .post("/api/v1/students")
        .set("Authorization", `Bearer ${token}`)
        .send({
          firstName: `Student${i}`,
          lastName: "Archived",
          gender: i % 2 === 0 ? "Female" : "Male",
          dateOfBirth: `2012-05-${String((i % 28) + 1).padStart(2, "0")}`,
          currentClass: "JSS1",
          session: "2025/2026",
        });

      expect(response.statusCode).toBe(201);

      await request(app)
        .delete(`/api/v1/students/${response.body.student.studentId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    }

    const response = await request(app)
      .get("/api/v1/students/archived?page=2&limit=10")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.totalStudents).toBe(25);

    expect(response.body.page).toBe(2);
    expect(response.body.limit).toBe(10);
    expect(response.body.totalPages).toBe(3);

    expect(Array.isArray(response.body.students)).toBe(true);
    expect(response.body.students).toHaveLength(10);

    response.body.students.forEach((student) => {
      expect(student.isActive).toBe(false);
    });
  });

  test("Should return the correct final page of archived students", async () => {
    const studentsToCreate = 25;

    for (let i = 1; i <= studentsToCreate; i++) {
      const response = await request(app)
        .post("/api/v1/students")
        .set("Authorization", `Bearer ${token}`)
        .send({
          firstName: `Student${i}`,
          lastName: "Archived",
          gender: i % 2 === 0 ? "Female" : "Male",
          dateOfBirth: `2012-06-${String((i % 28) + 1).padStart(2, "0")}`,
          currentClass: "JSS1",
          session: "2025/2026",
        });

      expect(response.statusCode).toBe(201);

      await request(app)
        .delete(`/api/v1/students/${response.body.student.studentId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    }

    const response = await request(app)
      .get("/api/v1/students/archived?page=3&limit=10")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.totalStudents).toBe(25);

    expect(response.body.page).toBe(3);
    expect(response.body.limit).toBe(10);
    expect(response.body.totalPages).toBe(3);

    expect(response.body.students).toHaveLength(5);
  });

  test("Should cap archived student limit at 100", async () => {
    const studentsToCreate = 25;

    for (let i = 1; i <= studentsToCreate; i++) {
      const response = await request(app)
        .post("/api/v1/students")
        .set("Authorization", `Bearer ${token}`)
        .send({
          firstName: `LimitStudent${i}`,
          lastName: "Archived",
          gender: i % 2 === 0 ? "Female" : "Male",
          dateOfBirth: `2011-07-${String((i % 28) + 1).padStart(2, "0")}`,
          currentClass: "JSS2",
          session: "2025/2026",
        });

      expect(response.statusCode).toBe(201);

      await request(app)
        .delete(`/api/v1/students/${response.body.student.studentId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    }

    const response = await request(app)
      .get("/api/v1/students/archived?limit=1000")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.totalStudents).toBe(25);

    expect(response.body.limit).toBe(100);
    expect(response.body.totalPages).toBe(1);
    expect(response.body.students).toHaveLength(25);
  });

  test("Should use default pagination values for archived students", async () => {
    const studentsToCreate = 25;

    for (let i = 1; i <= studentsToCreate; i++) {
      const response = await request(app)
        .post("/api/v1/students")
        .set("Authorization", `Bearer ${token}`)
        .send({
          firstName: `DefaultStudent${i}`,
          lastName: "Archived",
          gender: i % 2 === 0 ? "Female" : "Male",
          dateOfBirth: `2010-08-${String((i % 28) + 1).padStart(2, "0")}`,
          currentClass: "JSS2",
          session: "2025/2026",
        });

      expect(response.statusCode).toBe(201);

      await request(app)
        .delete(`/api/v1/students/${response.body.student.studentId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    }

    const response = await request(app)
      .get("/api/v1/students/archived")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.totalStudents).toBe(25);

    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(20);
    expect(response.body.totalPages).toBe(2);

    expect(response.body.students).toHaveLength(20);
  });
});
