const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const ResultDocument = require("../models/ResultDocument");

const VALID_CODE = "A".repeat(36);

const createVerificationDocument = async ({
  code = VALID_CODE,
  status = "valid",
  revocationReason = "",
} = {}) => {
  return ResultDocument.create({
    result: new mongoose.Types.ObjectId(),
    student: new mongoose.Types.ObjectId(),
    verificationCode: code,
    status,
    revocationReason,
    issuedAt: new Date("2026-11-27T10:00:00.000Z"),
    resultSnapshot: {
      student: {
        studentId: "TCC00001",
        firstName: "John",
        lastName: "Doe",
        otherName: "Michael",
      },
      currentClass: "JSS2",
      academicSession: {
        name: "2025/2026",
      },
      term: "first",
      publishedAt: new Date("2026-11-20T10:00:00.000Z"),
      subjectResults: [
        {
          subjectName: "Mathematics",
          total: 95,
        },
      ],
    },
  });
};

afterEach(async () => {
  await ResultDocument.deleteMany({});
});

describe("Public Official Result Verification", () => {
  test("should verify a valid official result without authentication", async () => {
    await createVerificationDocument();

    const response = await request(app).get(
      `/api/v1/verify-result/${VALID_CODE}`,
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.valid).toBe(true);
    expect(response.body.status).toBe("valid");

    expect(response.body.student.studentId).toBe("TCC00001");
    expect(response.body.student.name).toBe("John Michael Doe");
    expect(response.body.student.class).toBe("JSS2");

    expect(response.body.result.academicSession).toBe("2025/2026");
    expect(response.body.result.term).toBe("first");

    // Public verification must not expose individual subject scores.
    expect(response.body.result.subjectResults).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('"total":95');
  });

  test("should identify a superseded document", async () => {
    await createVerificationDocument({
      status: "superseded",
    });

    const response = await request(app).get(
      `/api/v1/verify-result/${VALID_CODE}`,
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.valid).toBe(false);
    expect(response.body.status).toBe("superseded");
    expect(response.body.message).toMatch(/superseded/i);
  });

  test("should identify a revoked document", async () => {
    await createVerificationDocument({
      status: "revoked",
      revocationReason: "Result was officially withdrawn.",
    });

    const response = await request(app).get(
      `/api/v1/verify-result/${VALID_CODE}`,
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.valid).toBe(false);
    expect(response.body.status).toBe("revoked");
    expect(response.body.document.revocationReason).toBe(
      "Result was officially withdrawn.",
    );
  });

  test("should return 404 for an unknown verification code", async () => {
    const response = await request(app).get(
      `/api/v1/verify-result/${"B".repeat(36)}`,
    );

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.valid).toBe(false);
    expect(response.body.status).toBe("not_found");
  });

  test("should reject an incorrectly formatted verification code", async () => {
    const response = await request(app).get(
      "/api/v1/verify-result/INVALID-CODE",
    );

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/invalid verification code/i);
  });
});
