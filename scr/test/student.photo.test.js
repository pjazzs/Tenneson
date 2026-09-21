const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const Admin = require("../models/Admin");
const ActivityLog = require("../models/activityLog");
const bcrypt = require("bcrypt");

// Mock Cloudinary
jest.mock("../config/cloudinary", () => ({
  uploader: {
    destroy: jest.fn().mockResolvedValue({
      result: "ok",
    }),
  },
}));

// Mock photo upload middleware
jest.mock("../middleware/photoUpload", () => {
  const multer = require("multer");

  const upload = multer({
    storage: multer.memoryStorage(),
  });

  const originalSingle = upload.single.bind(upload);

  return {
    single: (fieldName) => {
      const middleware = originalSingle(fieldName);

      return (req, res, next) => {
        middleware(req, res, (err) => {
          if (err) {
            return next(err);
          }

          // If a file was uploaded, provide the same
          // properties CloudinaryStorage normally provides.
          if (req.file) {
            req.file.path = "https://res.cloudinary.com/test/student-photo.jpg";

            req.file.filename = "student-photos/test-student-photo";
          }

          next();
        });
      };
    },
  };
});

describe("Student Photo Upload API", () => {
  let token;
  let studentId;
  let studentMongoId;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const adminEmail = `admin${Date.now()}@test.com`;

    await Admin.create({
      fullName: "Test Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      permissions: ["students.create", "students.view", "students.photo"],
    });

    // Login admin
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: adminEmail,
      password: "password123",
    });

    expect(loginResponse.statusCode).toBe(200);

    token = loginResponse.body.token;

    // Create student
    const studentResponse = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "John",
        lastName: "Doe",
        gender: "Male",
        dateOfBirth: "2012-05-10",
        admissionYear: 2025,
        currentClass: "JSS1",
        session: "2025/2026",
        parentPhone: "08012345678",
      });

    expect(studentResponse.statusCode).toBe(201);

    // Official student ID.
    // Example: 2025/TCC00071
    studentId = studentResponse.body.student.studentId;

    // MongoDB document ID.
    // Protected internal student resource routes use this ID.
    studentMongoId = studentResponse.body.student._id;
  });

  test("Should upload a student photo successfully", async () => {
    const response = await request(app)
      .patch(`/api/v1/students/${studentMongoId}/photo`)
      .set("Authorization", `Bearer ${token}`)
      .attach("photo", Buffer.from("fake jpeg image data"), "student.jpg");

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe("Student photo uploaded successfully.");

    expect(response.body.photo).toBeDefined();

    expect(response.body.photo.url).toBe(
      "https://res.cloudinary.com/test/student-photo.jpg",
    );

    expect(response.body.photo.publicId).toBe(
      "student-photos/test-student-photo",
    );
  });

  test("Should reject photo upload when no photo is provided", async () => {
    const response = await request(app)
      .patch(`/api/v1/students/${studentMongoId}/photo`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(400);

    expect(response.body.success).toBe(false);
  });

  test("Should return 404 when uploading photo for non-existing student", async () => {
    const nonExistingStudentId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .patch(`/api/v1/students/${nonExistingStudentId}/photo`)
      .set("Authorization", `Bearer ${token}`)
      .attach("photo", Buffer.from("fake jpeg image data"), "student.jpg");

    expect(response.statusCode).toBe(404);

    expect(response.body.success).toBe(false);
  });

  test("Should require student photo permission", async () => {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const adminEmail = `nopermission${Date.now()}@test.com`;

    await Admin.create({
      fullName: "No Photo Permission Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      permissions: ["students.create", "students.view"],
    });

    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: adminEmail,
      password: "password123",
    });

    expect(loginResponse.statusCode).toBe(200);

    const noPermissionToken = loginResponse.body.token;

    const response = await request(app)
      .patch(`/api/v1/students/${studentMongoId}/photo`)
      .set("Authorization", `Bearer ${noPermissionToken}`)
      .attach("photo", Buffer.from("fake jpeg image data"), "student.jpg");

    expect(response.statusCode).toBe(403);

    expect(response.body.success).toBe(false);
  });

  test("Should create activity log after successful photo upload", async () => {
    const response = await request(app)
      .patch(`/api/v1/students/${studentMongoId}/photo`)
      .set("Authorization", `Bearer ${token}`)
      .attach("photo", Buffer.from("fake jpeg image data"), "student.jpg");

    expect(response.statusCode).toBe(200);

    const log = await ActivityLog.findOne({
      studentId,
      action: "UPLOAD_STUDENT_PHOTO",
    });

    expect(log).toBeDefined();

    expect(log.action).toBe("UPLOAD_STUDENT_PHOTO");
  });
});
