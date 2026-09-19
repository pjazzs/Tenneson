const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const app = require("../app");

const Admin = require("../models/Admin");
const Student = require("../models/student");
const StudentCredential = require("../models/StudentCredential");
const generateToken = require("../utils/generateToken");

describe("Student Bulk Import Credential Security", () => {
  let admin;
  let adminToken;

  const adminPassword = "AdminPassword123!";

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    admin = await Admin.create({
      fullName: "Test Super Admin",
      email: "bulkimport@test.com",
      password: passwordHash,
      role: "super_admin",
      permissions: [],
    });

    adminToken = generateToken(admin);
  });

  test("should not expose temporary student passwords in the bulk import response", async () => {
    /*
     * ------------------------------------------------------------------------
     * Create temporary Excel file
     * ------------------------------------------------------------------------
     */

    const XLSX = require("xlsx");

    const workbook = XLSX.utils.book_new();

    const worksheet = XLSX.utils.json_to_sheet([
      {
        firstName: "John",
        lastName: "Doe",
        otherName: "",
        gender: "Male",
        dateOfBirth: "2012-05-10",
        currentClass: "JSS1",
        session: "2025/2026",
        parentName: "Jane Doe",
        parentPhone: "08012345678",
      },
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    const filePath = path.join(__dirname, "bulk-import-security-test.xlsx");

    XLSX.writeFile(workbook, filePath);

    /*
     * ------------------------------------------------------------------------
     * Perform bulk import
     * ------------------------------------------------------------------------
     */

    const response = await request(app)
      .post("/api/v1/students/import")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", filePath);

    /*
     * ------------------------------------------------------------------------
     * Clean up test file if it still exists
     * ------------------------------------------------------------------------
     */

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    /*
     * ------------------------------------------------------------------------
     * Verify successful import
     * ------------------------------------------------------------------------
     */

    expect(response.statusCode).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.summary.totalRows).toBe(1);

    expect(response.body.summary.imported).toBe(1);

    expect(response.body.summary.skipped).toBe(0);

    expect(response.body.importedStudents).toHaveLength(1);

    /*
     * ------------------------------------------------------------------------
     * Verify imported student response
     * ------------------------------------------------------------------------
     */

    const importedStudent = response.body.importedStudents[0];

    expect(importedStudent.studentId).toBeDefined();

    expect(importedStudent.username).toBeDefined();

    expect(importedStudent.mustChangePassword).toBe(true);

    /*
     * IMPORTANT:
     *
     * The plaintext temporary password must never be returned
     * by the bulk-import API.
     */

    expect(importedStudent).not.toHaveProperty("temporaryPassword");

    /*
     * ------------------------------------------------------------------------
     * Verify student was actually created
     * ------------------------------------------------------------------------
     */

    const student = await Student.findOne({
      studentId: importedStudent.studentId,
    });

    expect(student).not.toBeNull();

    expect(student.firstName).toBe("John");

    expect(student.lastName).toBe("Doe");

    /*
     * ------------------------------------------------------------------------
     * Verify credential was actually created
     * ------------------------------------------------------------------------
     */

    const credential = await StudentCredential.findOne({
      student: student._id,
    });

    expect(credential).not.toBeNull();

    expect(credential.username).toBe(importedStudent.username);

    expect(credential.passwordHash).toBeDefined();

    expect(credential.passwordHash).not.toBe("");

    expect(credential.mustChangePassword).toBe(true);

    expect(credential.isActive).toBe(true);
  });
});
