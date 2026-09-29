const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const app = require("../app");

const Admin = require("../models/Admin");
const Student = require("../models/student");
const StudentCredential = require("../models/StudentCredential");
const CredentialReport = require("../models/CredentialReport");
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
        admissionYear: 2025,
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
    console.log(
      "Bulk import response:",
      JSON.stringify(response.body, null, 2),
    );

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

    /*
     * ------------------------------------------------------------------------
     * Verify credential report was created
     * ------------------------------------------------------------------------
     */

    expect(response.body.credentialReport).toBeDefined();

    expect(response.body.credentialReport.reportId).toBeDefined();

    expect(response.body.credentialReport.reportToken).toBeDefined();

    expect(response.body.credentialReport.expiresIn).toBe(900);

    const credentialReport = await CredentialReport.findOne({
      reportId: response.body.credentialReport.reportId,
    });

    expect(credentialReport).not.toBeNull();

    expect(credentialReport.adminId.toString()).toBe(admin._id.toString());

    expect(credentialReport.consumed).toBe(false);

    expect(credentialReport.credentials).toHaveLength(1);

    const reportCredential = credentialReport.credentials[0];

    expect(reportCredential.studentId).toBe(importedStudent.studentId);

    expect(reportCredential.username).toBe(importedStudent.username);

    expect(reportCredential.temporaryPassword).toBeDefined();

    expect(reportCredential.temporaryPassword).not.toBe("");

    expect(reportCredential.mustChangePassword).toBe(true);

    /*
     * ------------------------------------------------------------------------
     * Verify credential report can be downloaded
     * ------------------------------------------------------------------------
     */

    const reportResponse = await request(app)
      .get("/api/v1/students/import/credential-report")
      .set("Authorization", `Bearer ${adminToken}`)
      .set(
        "X-Credential-Report-Token",
        response.body.credentialReport.reportToken,
      )
      .buffer(true)
      .parse((res, callback) => {
        const data = [];

        res.on("data", (chunk) => {
          data.push(chunk);
        });

        res.on("end", () => {
          callback(null, Buffer.concat(data));
        });
      });

    expect(reportResponse.statusCode).toBe(200);

    expect(reportResponse.headers["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    expect(reportResponse.headers["content-disposition"]).toContain(
      "Student-Credentials.xlsx",
    );

    expect(reportResponse.body).toBeDefined();

    expect(reportResponse.body.length).toBeGreaterThan(0);

    /*
     * ------------------------------------------------------------------------
     * Verify report was consumed
     * ------------------------------------------------------------------------
     */

    const consumedReport = await CredentialReport.findOne({
      reportId: response.body.credentialReport.reportId,
    });

    expect(consumedReport).not.toBeNull();

    expect(consumedReport.consumed).toBe(true);
  });

  test("should not allow a credential report to be downloaded twice", async () => {
    const XLSX = require("xlsx");

    const workbook = XLSX.utils.book_new();

    const worksheet = XLSX.utils.json_to_sheet([
      {
        firstName: "Michael",
        lastName: "Smith",
        otherName: "",
        gender: "Male",
        dateOfBirth: "2011-03-15",
        admissionYear: 2025,
        currentClass: "JSS2",
        session: "2025/2026",
        parentName: "Mary Smith",
        parentPhone: "08098765432",
      },
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    const filePath = path.join(
      __dirname,
      "bulk-import-consumed-report-test.xlsx",
    );

    XLSX.writeFile(workbook, filePath);

    const importResponse = await request(app)
      .post("/api/v1/students/import")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", filePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    expect(importResponse.statusCode).toBe(201);

    const reportToken = importResponse.body.credentialReport.reportToken;

    const firstDownload = await request(app)
      .get("/api/v1/students/import/credential-report")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Credential-Report-Token", reportToken)
      .buffer(true)
      .parse((res, callback) => {
        const data = [];

        res.on("data", (chunk) => {
          data.push(chunk);
        });

        res.on("end", () => {
          callback(null, Buffer.concat(data));
        });
      });

    expect(firstDownload.statusCode).toBe(200);

    const secondDownload = await request(app)
      .get("/api/v1/students/import/credential-report")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Credential-Report-Token", reportToken);

    expect(secondDownload.statusCode).toBe(410);

    expect(secondDownload.body.success).toBe(false);

    expect(secondDownload.body.message).toBe(
      "Credential report has already been downloaded.",
    );
  });

  test("should not allow another admin to download the credential report", async () => {
    const XLSX = require("xlsx");

    const secondAdminPassword = await bcrypt.hash(
      "SecondAdminPassword123!",
      12,
    );

    const secondAdmin = await Admin.create({
      fullName: "Second Test Admin",
      email: "second-admin@test.com",
      password: secondAdminPassword,
      role: "super_admin",
      permissions: [],
    });

    const secondAdminToken = generateToken(secondAdmin);

    const workbook = XLSX.utils.book_new();

    const worksheet = XLSX.utils.json_to_sheet([
      {
        firstName: "Sarah",
        lastName: "Johnson",
        otherName: "",
        gender: "Female",
        dateOfBirth: "2010-08-20",
        admissionYear: 2025,
        currentClass: "JSS3",
        session: "2025/2026",
        parentName: "David Johnson",
        parentPhone: "08011112222",
      },
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    const filePath = path.join(
      __dirname,
      "bulk-import-unauthorized-report-test.xlsx",
    );

    XLSX.writeFile(workbook, filePath);

    const importResponse = await request(app)
      .post("/api/v1/students/import")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", filePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    expect(importResponse.statusCode).toBe(201);

    const reportToken = importResponse.body.credentialReport.reportToken;

    const response = await request(app)
      .get("/api/v1/students/import/credential-report")
      .set("Authorization", `Bearer ${secondAdminToken}`)
      .set("X-Credential-Report-Token", reportToken);

    expect(response.statusCode).toBe(403);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe(
      "You are not authorized to download this credential report.",
    );
  });
  test("should reject an expired credential report", async () => {
    const XLSX = require("xlsx");

    const workbook = XLSX.utils.book_new();

    const worksheet = XLSX.utils.json_to_sheet([
      {
        firstName: "Expired",
        lastName: "Student",
        otherName: "",
        gender: "Male",
        dateOfBirth: "2012-01-10",
        admissionYear: 2025,
        currentClass: "JSS1",
        session: "2025/2026",
        parentName: "Test Parent",
        parentPhone: "08012345678",
      },
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    const filePath = path.join(
      __dirname,
      "bulk-import-expired-report-test.xlsx",
    );

    XLSX.writeFile(workbook, filePath);

    const importResponse = await request(app)
      .post("/api/v1/students/import")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", filePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    expect(importResponse.statusCode).toBe(201);

    const { reportId, reportToken } = importResponse.body.credentialReport;

    /*
     * Force the report to expire.
     */

    await CredentialReport.updateOne(
      { reportId },
      {
        $set: {
          expiresAt: new Date(Date.now() - 1000),
        },
      },
    );

    const response = await request(app)
      .get("/api/v1/students/import/credential-report")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Credential-Report-Token", reportToken);

    expect(response.statusCode).toBe(410);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe("Credential report has expired.");
  });
});
