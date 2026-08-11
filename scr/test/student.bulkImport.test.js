const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const ActivityLog = require("../models/activityLog");
const bcrypt = require("bcrypt");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

describe("Student Bulk Import API", () => {
  let token;

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
        "students.import",
      ],
    });

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: adminEmail,
        password: "password123",
      });

    expect(loginResponse.statusCode).toBe(200);

    token = loginResponse.body.token;
  });

  const createExcelFile = (rows, filename = "students.xlsx") => {
    const workbook = XLSX.utils.book_new();

    const worksheet = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Students"
    );

    const filePath = path.join(__dirname, filename);

    XLSX.writeFile(workbook, filePath);

    return filePath;
  };

  afterEach(() => {
    const testFiles = [
      "students.xlsx",
      "students-missing-fields.xlsx",
      "students-invalid-gender.xlsx",
      "students-duplicate.xlsx",
      "students-invalid-date.xlsx",
    ];

    for (const filename of testFiles) {
      const filePath = path.join(__dirname, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  test("Should import students successfully", async () => {
    const filePath = createExcelFile(
      [
        {
          firstName: "John",
          lastName: "Doe",
          gender: "Male",
          dateOfBirth: "2012-05-10",
          currentClass: "JSS1",
          session: "2025/2026",
          parentName: "Mr Doe",
          parentPhone: "08012345678",
        },
        {
          firstName: "Jane",
          lastName: "Smith",
          gender: "Female",
          dateOfBirth: "2011-06-15",
          currentClass: "JSS2",
          session: "2025/2026",
          parentName: "Mrs Smith",
          parentPhone: "08087654321",
        },
      ],
      "students.xlsx"
    );

    const response = await request(app)
      .post("/api/v1/students/import")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", filePath);

    expect(response.statusCode).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Bulk import completed successfully."
    );

    expect(response.body.summary.totalRows).toBe(2);

    expect(response.body.summary.imported).toBe(2);

    expect(response.body.summary.skipped).toBe(0);

    expect(response.body.importedStudents).toHaveLength(2);

    const students = await Student.find();

    expect(students).toHaveLength(2);
  });

  test("Should reject bulk import when no file is provided", async () => {
    const response = await request(app)
      .post("/api/v1/students/import")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(400);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe(
      "Please upload an Excel file."
    );
  });

  test("Should skip students with missing required fields", async () => {
    const filePath = createExcelFile(
      [
        {
          firstName: "John",
          lastName: "Doe",
          gender: "Male",
          dateOfBirth: "2012-05-10",
          currentClass: "JSS1",
          session: "2025/2026",
        },
        {
          firstName: "Jane",
          lastName: "",
          gender: "Female",
          dateOfBirth: "2011-06-15",
          currentClass: "JSS2",
          session: "2025/2026",
        },
      ],
      "students-missing-fields.xlsx"
    );

    const response = await request(app)
      .post("/api/v1/students/import")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", filePath);

    expect(response.statusCode).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.summary.totalRows).toBe(2);

    expect(response.body.summary.imported).toBe(1);

    expect(response.body.summary.skipped).toBe(1);

    expect(response.body.skippedStudents).toHaveLength(1);

    expect(
      response.body.skippedStudents[0].reason
    ).toBe("Missing required fields.");

    const students = await Student.find();

    expect(students).toHaveLength(1);
  });

  test("Should skip students with invalid gender", async () => {
    const filePath = createExcelFile(
      [
        {
          firstName: "John",
          lastName: "Doe",
          gender: "Unknown",
          dateOfBirth: "2012-05-10",
          currentClass: "JSS1",
          session: "2025/2026",
        },
      ],
      "students-invalid-gender.xlsx"
    );

    const response = await request(app)
      .post("/api/v1/students/import")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", filePath);

    expect(response.statusCode).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.summary.totalRows).toBe(1);

    expect(response.body.summary.imported).toBe(0);

    expect(response.body.summary.skipped).toBe(1);

    expect(response.body.skippedStudents[0].reason).toBe(
      "Gender must be Male or Female."
    );

    const students = await Student.find();

    expect(students).toHaveLength(0);
  });

  test("Should skip duplicate students", async () => {
    await Student.create({
      studentId: "TCC00001",
      firstName: "John",
      lastName: "Doe",
      gender: "Male",
      dateOfBirth: new Date("2012-05-10"),
      currentClass: "JSS1",
      session: "2025/2026",
      isActive: true,
    });

    const filePath = createExcelFile(
      [
        {
          firstName: "John",
          lastName: "Doe",
          gender: "Male",
          dateOfBirth: "2012-05-10",
          currentClass: "JSS1",
          session: "2025/2026",
        },
      ],
      "students-duplicate.xlsx"
    );

    const response = await request(app)
      .post("/api/v1/students/import")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", filePath);

    expect(response.statusCode).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.summary.totalRows).toBe(1);

    expect(response.body.summary.imported).toBe(0);

    expect(response.body.summary.skipped).toBe(1);

    expect(response.body.skippedStudents[0].reason).toBe(
      "Student already exists."
    );

    expect(
      response.body.skippedStudents[0].existingStudentId
    ).toBe("TCC00001");

    const students = await Student.find();

    expect(students).toHaveLength(1);
  });

  test("Should skip students with invalid date of birth", async () => {
    const filePath = createExcelFile(
      [
        {
          firstName: "John",
          lastName: "Doe",
          gender: "Male",
          dateOfBirth: "invalid-date",
          currentClass: "JSS1",
          session: "2025/2026",
        },
      ],
      "students-invalid-date.xlsx"
    );

    const response = await request(app)
      .post("/api/v1/students/import")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", filePath);

    expect(response.statusCode).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.summary.totalRows).toBe(1);

    expect(response.body.summary.imported).toBe(0);

    expect(response.body.summary.skipped).toBe(1);

    expect(
      response.body.skippedStudents[0].reason
    ).toBe("Invalid date of birth format.");

    const students = await Student.find();

    expect(students).toHaveLength(0);
  });

  test("Should require students.import permission", async () => {
    const hashedPassword = await bcrypt.hash(
      "password123",
      12
    );

    const adminEmail = `noimport${Date.now()}@test.com`;

    await Admin.create({
      fullName: "No Import Permission Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
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

    expect(loginResponse.statusCode).toBe(200);

    const noPermissionToken =
      loginResponse.body.token;

    const filePath = createExcelFile([
      {
        firstName: "John",
        lastName: "Doe",
        gender: "Male",
        dateOfBirth: "2012-05-10",
        currentClass: "JSS1",
        session: "2025/2026",
      },
    ]);

    const response = await request(app)
      .post("/api/v1/students/import")
      .set(
        "Authorization",
        `Bearer ${noPermissionToken}`
      )
      .attach("file", filePath);

    expect(response.statusCode).toBe(403);

    expect(response.body.success).toBe(false);
  });

  test("Should create activity log after bulk import", async () => {
    const filePath = createExcelFile([
      {
        firstName: "John",
        lastName: "Doe",
        gender: "Male",
        dateOfBirth: "2012-05-10",
        currentClass: "JSS1",
        session: "2025/2026",
      },
    ]);

    const response = await request(app)
      .post("/api/v1/students/import")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", filePath);

     

    expect(response.statusCode).toBe(201);

    const log = await ActivityLog.findOne({
      action: "Bulk Import",
    });

    expect(log).toBeDefined();

    expect(log.action).toBe("Bulk Import");

    expect(log.details).toBe("1 students imported");
  });
});