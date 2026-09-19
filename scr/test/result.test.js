const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");

const Student = require("../models/student");
const Admin = require("../models/Admin");
const AcademicSession = require("../models/AcademicSession");
const Subject = require("../models/Subject");
const Result = require("../models/Result");
const generateToken = require("../utils/generateToken");

const API = "/api/v1";

jest.setTimeout(120000);

let admin;
let adminToken;

let secondAdmin;
let secondAdminToken;

let student;
let secondStudent;

let academicSession;
let secondAcademicSession;

let subject;

const createAdmin = async ({
  fullName = "Test Admin",
  email = "admin@test.com",
  role = "admin",
  permissions = [
    "results.create",
    "results.view",
    "results.update",
    "results.submit",
    "results.approve",
    "results.publish",
  ],
} = {}) => {
  const created = await Admin.create({
    fullName,
    email,
    password: "Password123!",
    role,
    permissions,
  });

  return created;
};

const makeAdminToken = (adminUser) => {
  return generateToken(adminUser);
};

const createStudent = async ({
  studentId = `TCC${Date.now()}${Math.floor(Math.random() * 1000)}`,
  firstName = "John",
  lastName = "Doe",
  currentClass = "JSS1",
  session = "2025/2026",
} = {}) => {
  return Student.create({
    studentId,
    firstName,
    lastName,
    otherName: "",
    gender: "Male",
    dateOfBirth: new Date("2012-01-15"),
    currentClass,
    session,
    parentName: "Jane Doe",
    parentPhone: "08012345678",
    isActive: true,
  });
};

const createAcademicSession = async ({
  name = "2025/2026",
  isActive = true,
} = {}) => {
  return AcademicSession.create({
    name,
    isActive,
    terms: [
      {
        key: "first",
        name: "First Term",
        isActive: true,
      },
      {
        key: "second",
        name: "Second Term",
        isActive: false,
      },
      {
        key: "third",
        name: "Third Term",
        isActive: false,
      },
    ],
  });
};

const createSubject = async ({ name = "Mathematics", code = "MATH" } = {}) => {
  return Subject.create({
    name,
    code,
    isActive: true,
  });
};

const createSubjects = async (subjects) => {
  return Subject.insertMany(
    subjects.map((subjectData) => ({
      ...subjectData,
      isActive: true,
    })),
  );
};

const buildSubjectResult = ({
  subjectId = subject._id,
  offered = true,
  ca1 = 15,
  ca2 = 8,
  exam = 60,
  teacherComment = "Good performance.",
} = {}) => {
  return {
    subjectId: subjectId.toString(),
    offered,
    ca1,
    ca2,
    exam,
    teacherComment,
  };
};

const buildAttendance = () => ({
  daysSchoolOpened: 60,
  daysPresent: 55,
  daysAbsent: 5,
});

const buildAffectiveDomain = () => ({
  punctuality: 4,
  attentiveness: 4,
  neatness: 5,
  politeness: 4,
  reliability: 4,
  honesty: 5,
  initiative: 4,
  attitudeToWork: 4,
});

const buildPsychomotorDomain = () => ({
  sportingActivities: 4,
  handWriting: 4,
  fluency: 4,
  drawingAndPainting: 3,
  musicalAbility: 4,
});

const buildDraftBody = ({
  studentId = student.studentId,
  academicSessionId = academicSession._id,
  term = "first",
  subjectResults = [buildSubjectResult()],
  overrides = {},
} = {}) => {
  return {
    studentId,
    academicSessionId: academicSessionId.toString(),
    term,
    subjectResults,
    ...overrides,
  };
};

const buildCompleteResultBody = ({
  studentId = student.studentId,
  academicSessionId = academicSession._id,
  term = "first",
  subjectResults = [buildSubjectResult()],
  overrides = {},
} = {}) => {
  return {
    studentId,
    academicSessionId: academicSessionId.toString(),
    term,
    subjectResults,

    attendance: buildAttendance(),

    affectiveDomain: buildAffectiveDomain(),

    psychomotorDomain: buildPsychomotorDomain(),

    conduct: "good",

    specialReport: "Student participated actively in school activities.",

    sports: [
      {
        event: "Football",
        remark: "Participated actively.",
      },
    ],

    clubs: [
      {
        organization: "Press Club",
        officeHeld: "Member",
        significantContribution: "Participated in school publications.",
      },
    ],

    comments: {
      classTeacher: "A good student. Keep working hard.",
    },

    ...overrides,
  };
};

const createStoredResult = async ({
  student: resultStudent = student,
  academicSession: resultSession = academicSession,
  subject: resultSubject = subject,
  term = "first",
  status = "draft",
  principal = "",
  total = 83,
} = {}) => {
  return Result.create({
    student: resultStudent._id,
    academicSession: resultSession._id,
    term,
    currentClass: resultStudent.currentClass,

    subjectResults: [
      {
        subject: resultSubject._id,
        subjectName: resultSubject.name,
        subjectCode: resultSubject.code,
        offered: true,
        ca1: 15,
        ca2: 8,
        exam: 60,
        total,
        firstTerm: {
          offered: false,
          total: null,
        },
        secondTerm: {
          offered: false,
          total: null,
        },
        cumulativeScore: term === "third" ? total : null,
        weightedAverage: term === "third" ? total : null,
        grade: total >= 70 ? "D" : total >= 60 ? "M" : "P",
        remark: total >= 70 ? "DISTINCTION" : "PASS",
        teacherComment: "Good performance.",
      },
    ],

    attendance: buildAttendance(),

    affectiveDomain: buildAffectiveDomain(),

    psychomotorDomain: buildPsychomotorDomain(),

    conduct: "good",

    specialReport: "",

    sports: [],

    clubs: [],

    comments: {
      classTeacher: "Good performance.",
      principal,
      performance: "",
    },

    termDates: {
      closingDate: null,
      resumptionDate: null,
    },

    totalScore: total,
    totalObtainableMarks: 100,
    overallPercentage: total,
    performanceComment:
      total >= 70
        ? "Excellent performance. Keep up the good work."
        : "Good result. You can achieve even better with greater effort.",

    promotionStatus:
      term === "third"
        ? total >= 50
          ? "recommended_promoted"
          : "recommended_repeat"
        : "not_applicable",

    principalDecision: "pending",

    status,

    createdBy: admin._id,
    updatedBy: admin._id,

    submittedBy:
      status === "submitted" || status === "approved" || status === "published"
        ? admin._id
        : null,

    submittedAt:
      status === "submitted" || status === "approved" || status === "published"
        ? new Date()
        : null,

    approvedBy:
      status === "approved" || status === "published" ? admin._id : null,

    approvedAt:
      status === "approved" || status === "published" ? new Date() : null,

    publishedBy: status === "published" ? admin._id : null,

    publishedAt: status === "published" ? new Date() : null,
  });
};

beforeEach(async () => {
  admin = await createAdmin({
    fullName: "Test Admin",
    email: "admin@test.com",
    permissions: [
      "results.create",
      "results.view",
      "results.update",
      "results.submit",
      "results.approve",
      "results.publish",
    ],
  });

  adminToken = makeAdminToken(admin);

  secondAdmin = await createAdmin({
    fullName: "Limited Admin",
    email: "limited@test.com",
    permissions: [],
  });

  secondAdminToken = makeAdminToken(secondAdmin);

  student = await createStudent({
    studentId: "TCC00001",
    firstName: "John",
    lastName: "Doe",
    currentClass: "JSS1",
  });

  secondStudent = await createStudent({
    studentId: "TCC00002",
    firstName: "Jane",
    lastName: "Smith",
    currentClass: "JSS1",
  });

  academicSession = await createAcademicSession({
    name: "2025/2026",
  });

  secondAcademicSession = await createAcademicSession({
    name: "2026/2027",
    isActive: false,
  });

  subject = await createSubject({
    name: "Mathematics",
    code: "MATH",
  });

  secondSubject = await createSubject({
    name: "English Language",
    code: "ENG",
  });
});

describe("RESULT API", () => {
  describe("POST /results - createResult", () => {
    test("creates a draft result with valid data", async () => {
      const response = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
          }),
        );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.status).toBe("draft");

      expect(response.body.result.student).toBeDefined();
      expect(response.body.result.academicSession).toBeDefined();

      expect(response.body.result.term).toBe("first");

      expect(response.body.result.subjectResults).toHaveLength(1);

      expect(response.body.result.subjectResults[0].subjectName).toBe(
        subject.name,
      );

      expect(response.body.result.subjectResults[0].total).toBe(83);
    });

    test("requires authentication", async () => {
      const response = await request(app)
        .post(`${API}/results`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
          }),
        );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("rejects an admin without results.create permission", async () => {
      const response = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${secondAdminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
          }),
        );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test("returns 404 for an unknown student", async () => {
      const response = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: "TCC99999",
            academicSessionId: academicSession._id,
          }),
        );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/student/i);
    });

    test("returns 404 for an unknown academic session", async () => {
      const response = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: new mongoose.Types.ObjectId(),
          }),
        );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/academic session/i);
    });

    test("rejects an invalid term", async () => {
      const response = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ...buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
          }),
          term: "fourth",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("rejects invalid subject ID", async () => {
      const response = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
            subjectResults: [
              {
                subjectId: "invalid-subject-id",
                offered: true,
                ca1: 15,
                ca2: 8,
                exam: 60,
              },
            ],
          }),
        );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("allows an unoffered subject with scores to remain in a draft", async () => {
      const response = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
            subjectResults: [
              {
                subjectId: subject._id.toString(),
                offered: false,
                ca1: 10,
                ca2: 5,
                exam: 50,
              },
            ],
          }),
        );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.status).toBe("draft");
    });

    test("allows an unoffered subject without scores", async () => {
      const response = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
            subjectResults: [
              {
                subjectId: subject._id.toString(),
                offered: false,
                ca1: null,
                ca2: null,
                exam: null,
              },
            ],
          }),
        );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.result.subjectResults[0].offered).toBe(false);

      expect(response.body.result.subjectResults[0].total).toBeNull();
    });

    test("rejects scores above the allowed CA1 maximum", async () => {
      const response = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
            subjectResults: [
              {
                subjectId: subject._id.toString(),
                offered: true,
                ca1: 21,
                ca2: 8,
                exam: 60,
              },
            ],
          }),
        );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("rejects scores above the allowed CA2 maximum", async () => {
      const response = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
            subjectResults: [
              {
                subjectId: subject._id.toString(),
                offered: true,
                ca1: 15,
                ca2: 11,
                exam: 60,
              },
            ],
          }),
        );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("rejects scores above the allowed examination maximum", async () => {
      const response = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
            subjectResults: [
              {
                subjectId: subject._id.toString(),
                offered: true,
                ca1: 15,
                ca2: 8,
                exam: 71,
              },
            ],
          }),
        );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("rejects duplicate result for the same student, session, and term", async () => {
      const firstResponse = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
            term: "first",
          }),
        );

      expect(firstResponse.status).toBe(201);

      const secondResponse = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
            term: "first",
          }),
        );

      expect([400, 409]).toContain(secondResponse.status);
      expect(secondResponse.body.success).toBe(false);
    });

    test("allows the same student to have results for different terms", async () => {
      const firstResponse = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
            term: "first",
          }),
        );

      expect(firstResponse.status).toBe(201);

      const secondResponse = await request(app)
        .post(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          buildDraftBody({
            studentId: student.studentId,
            academicSessionId: academicSession._id,
            term: "second",
          }),
        );

      expect(secondResponse.status).toBe(201);
    });
  });

  describe("GET /results/:id - getResult", () => {
    test("returns a result by ID", async () => {
      const result = await createStoredResult();

      const response = await request(app)
        .get(`${API}/results/${result._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result._id).toBe(result._id.toString());
      expect(response.body.result.student.studentId).toBe(student.studentId);
      expect(response.body.result.status).toBe("draft");
    });

    test("requires authentication", async () => {
      const result = await createStoredResult();

      const response = await request(app).get(`${API}/results/${result._id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("rejects an admin without results.view permission", async () => {
      const result = await createStoredResult();

      const response = await request(app)
        .get(`${API}/results/${result._id}`)
        .set("Authorization", `Bearer ${secondAdminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test("returns 404 for an unknown result ID", async () => {
      const response = await request(app)
        .get(`${API}/results/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test("returns 400 for an invalid result ID", async () => {
      const response = await request(app)
        .get(`${API}/results/not-a-valid-id`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /results - getResults", () => {
    test("returns results for an authenticated admin", async () => {
      await createStoredResult();

      const response = await request(app)
        .get(`${API}/results`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results).toHaveLength(1);
    });

    test("requires authentication", async () => {
      const response = await request(app).get(`${API}/results`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("rejects an admin without results.view permission", async () => {
      const response = await request(app)
        .get(`${API}/results`)
        .set("Authorization", `Bearer ${secondAdminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test("filters results by term", async () => {
      await createStoredResult({
        term: "first",
      });

      await createStoredResult({
        student: secondStudent,
        term: "second",
      });

      const response = await request(app)
        .get(`${API}/results`)
        .query({
          term: "first",
        })
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].term).toBe("first");
    });

    test("filters results by class", async () => {
      const jss1Result = await createStoredResult({
        student,
      });

      const ss1Student = await createStudent({
        studentId: "TCC00003",
        firstName: "Peter",
        lastName: "James",
        currentClass: "SS1",
      });

      await createStoredResult({
        student: ss1Student,
      });

      const response = await request(app)
        .get(`${API}/results`)
        .query({
          currentClass: "JSS1",
        })
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]._id).toBe(jss1Result._id.toString());
    });

    test("filters results by student", async () => {
      await createStoredResult({
        student,
      });

      await createStoredResult({
        student: secondStudent,
        term: "second",
      });

      const response = await request(app)
        .get(`${API}/results`)
        .query({
          studentId: student.studentId,
        })
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].student.studentId).toBe(
        student.studentId,
      );
    });

    test("filters results by status", async () => {
      await createStoredResult({
        status: "draft",
      });

      await createStoredResult({
        student: secondStudent,
        term: "second",
        status: "submitted",
      });

      const response = await request(app)
        .get(`${API}/results`)
        .query({
          status: "submitted",
        })
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].status).toBe("submitted");
    });

    test("supports pagination", async () => {
      await createStoredResult({
        term: "first",
      });

      await createStoredResult({
        student: secondStudent,
        term: "second",
      });

      const response = await request(app)
        .get(`${API}/results`)
        .query({
          page: 1,
          limit: 1,
        })
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(1);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });
  });

  describe("PUT /results/:id - updateResult", () => {
    test("updates a draft result", async () => {
      const result = await createStoredResult();

      const response = await request(app)
        .put(`${API}/results/${result._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          subjectResults: [
            buildSubjectResult({
              ca1: 18,
              ca2: 9,
              exam: 65,
              teacherComment: "Updated comment.",
            }),
          ],
          attendance: buildAttendance(),
          affectiveDomain: buildAffectiveDomain(),
          psychomotorDomain: buildPsychomotorDomain(),
          comments: {
            classTeacher: "Updated class teacher comment.",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result.status).toBe("draft");

      const stored = await Result.findById(result._id);

      expect(stored.subjectResults[0].ca1).toBe(18);
      expect(stored.subjectResults[0].ca2).toBe(9);
      expect(stored.subjectResults[0].exam).toBe(65);
      expect(stored.subjectResults[0].teacherComment).toBe("Updated comment.");
    });

    test("requires authentication", async () => {
      const result = await createStoredResult();

      const response = await request(app)
        .put(`${API}/results/${result._id}`)
        .send({
          comments: {
            classTeacher: "Attempted edit.",
          },
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("rejects an admin without results.update permission", async () => {
      const result = await createStoredResult();

      const response = await request(app)
        .put(`${API}/results/${result._id}`)
        .set("Authorization", `Bearer ${secondAdminToken}`)
        .send({
          comments: {
            classTeacher: "Attempted edit.",
          },
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test("returns 404 for an unknown result", async () => {
      const response = await request(app)
        .put(`${API}/results/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          comments: {
            classTeacher: "Attempted edit.",
          },
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test("does not allow changing the result student", async () => {
      const result = await createStoredResult();

      const response = await request(app)
        .put(`${API}/results/${result._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          studentId: secondStudent.studentId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(
        /student associated with an existing result cannot be changed/i,
      );
    });

    test("does not allow changing the academic session", async () => {
      const result = await createStoredResult();

      const response = await request(app)
        .put(`${API}/results/${result._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          academicSessionId: secondAcademicSession._id.toString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(
        /academic session of an existing result cannot be changed/i,
      );
    });

    test("does not allow changing the term", async () => {
      const result = await createStoredResult();

      const response = await request(app)
        .put(`${API}/results/${result._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          term: "second",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(
        /term of an existing result cannot be changed/i,
      );
    });

    test("does not allow editing a submitted result", async () => {
      const result = await createStoredResult({
        status: "submitted",
      });

      const response = await request(app)
        .put(`${API}/results/${result._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          comments: {
            classTeacher: "Attempted edit.",
          },
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/cannot be edited/i);
    });

    test("does not allow editing an approved result", async () => {
      const result = await createStoredResult({
        status: "approved",
        principal: "Approved.",
      });

      const response = await request(app)
        .put(`${API}/results/${result._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          comments: {
            classTeacher: "Attempted edit.",
          },
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/cannot be edited/i);
    });

    test("does not allow editing a published result", async () => {
      const result = await createStoredResult({
        status: "published",
        principal: "Published.",
      });

      const response = await request(app)
        .put(`${API}/results/${result._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          comments: {
            classTeacher: "Attempted edit.",
          },
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/cannot be edited/i);
    });
  });
  describe("RESULT WORKFLOW", () => {
    describe("PATCH /results/:id/submit - submitResult", () => {
      test("submits a complete draft result", async () => {
        const createResponse = await request(app)
          .post(`${API}/results`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(
            buildCompleteResultBody({
              studentId: student.studentId,
              academicSessionId: academicSession._id,
              term: "first",
            }),
          );

        expect(createResponse.status).toBe(201);
        expect(createResponse.body.success).toBe(true);

        const resultId = createResponse.body.result._id;

        const response = await request(app)
          .patch(`${API}/results/${resultId}/submit`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.result).toBeDefined();
        expect(response.body.result.status).toBe("submitted");
      });

      test("requires authentication", async () => {
        const result = await createStoredResult();

        const response = await request(app).patch(
          `${API}/results/${result._id}/submit`,
        );

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      test("rejects an admin without results.submit permission", async () => {
        const result = await createStoredResult();

        const response = await request(app)
          .patch(`${API}/results/${result._id}/submit`)
          .set("Authorization", `Bearer ${secondAdminToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      test("rejects submission of a submitted result", async () => {
        const result = await createStoredResult({
          status: "submitted",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/submit`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/draft/i);
      });

      test("rejects submission of an approved result", async () => {
        const result = await createStoredResult({
          status: "approved",
          principal: "Approved by principal.",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/submit`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });

      test("rejects submission of a published result", async () => {
        const result = await createStoredResult({
          status: "published",
          principal: "Published result.",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/submit`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });

      test("rejects an incomplete subject score during submission", async () => {
        const createResponse = await request(app)
          .post(`${API}/results`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(
            buildCompleteResultBody({
              studentId: student.studentId,
              academicSessionId: academicSession._id,
              term: "first",
              subjectResults: [
                {
                  subjectId: subject._id.toString(),
                  offered: true,
                  ca1: 15,
                  ca2: null,
                  exam: 60,
                  teacherComment: "Good performance.",
                },
              ],
            }),
          );

        expect(createResponse.status).toBe(201);

        const resultId = createResponse.body.result._id;

        const response = await request(app)
          .patch(`${API}/results/${resultId}/submit`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test("rejects submission when attendance is incomplete", async () => {
        const createResponse = await request(app)
          .post(`${API}/results`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(
            buildCompleteResultBody({
              studentId: student.studentId,
              academicSessionId: academicSession._id,
              term: "first",
            }),
          );

        expect(createResponse.status).toBe(201);

        const resultId = createResponse.body.result._id;

        // Make the attendance incomplete after the valid draft has been created.
        await Result.findByIdAndUpdate(resultId, {
          $set: {
            "attendance.daysPresent": 90,
            "attendance.daysAbsent": 0,
            "attendance.daysSchoolOpened": 100,
          },
        });

        const response = await request(app)
          .patch(`${API}/results/${resultId}/submit`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test("rejects submission when affective assessment is incomplete", async () => {
        const createResponse = await request(app)
          .post(`${API}/results`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(
            buildCompleteResultBody({
              studentId: student.studentId,
              academicSessionId: academicSession._id,
              term: "first",
              overrides: {
                affectiveDomain: {
                  punctuality: 4,
                  attentiveness: 4,
                  neatness: 5,
                  politeness: 4,
                  reliability: 4,
                  honesty: 5,
                  initiative: 4,
                },
              },
            }),
          );

        expect(createResponse.status).toBe(201);

        const resultId = createResponse.body.result._id;

        const response = await request(app)
          .patch(`${API}/results/${resultId}/submit`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test("rejects submission when psychomotor assessment is incomplete", async () => {
        const createResponse = await request(app)
          .post(`${API}/results`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(
            buildCompleteResultBody({
              studentId: student.studentId,
              academicSessionId: academicSession._id,
              term: "first",
              overrides: {
                psychomotorDomain: {
                  sportingActivities: 4,
                  handWriting: 4,
                  fluency: 4,
                  drawingAndPainting: 3,
                },
              },
            }),
          );

        expect(createResponse.status).toBe(201);

        const resultId = createResponse.body.result._id;

        const response = await request(app)
          .patch(`${API}/results/${resultId}/submit`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test("rejects submission when class teacher comment is missing", async () => {
        const createResponse = await request(app)
          .post(`${API}/results`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(
            buildCompleteResultBody({
              studentId: student.studentId,
              academicSessionId: academicSession._id,
              term: "first",
              overrides: {
                comments: {
                  classTeacher: "",
                },
              },
            }),
          );

        expect(createResponse.status).toBe(201);

        const resultId = createResponse.body.result._id;

        const response = await request(app)
          .patch(`${API}/results/${resultId}/submit`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/class teacher comment/i);
      });

      test("returns 404 for an unknown result", async () => {
        const response = await request(app)
          .patch(`${API}/results/${new mongoose.Types.ObjectId()}/submit`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe("PATCH /results/:id/approve - approveResult", () => {
      test("approves a submitted result with principal comment", async () => {
        const createResponse = await request(app)
          .post(`${API}/results`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(
            buildCompleteResultBody({
              studentId: student.studentId,
              academicSessionId: academicSession._id,
              term: "first",
            }),
          );

        expect(createResponse.status).toBe(201);

        const resultId = createResponse.body.result._id;

        const submitResponse = await request(app)
          .patch(`${API}/results/${resultId}/submit`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(submitResponse.status).toBe(200);
        expect(submitResponse.body.result.status).toBe("submitted");

        const response = await request(app)
          .patch(`${API}/results/${resultId}/approve`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            principalComment: "Good performance. Keep improving.",
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.result.status).toBe("approved");

        expect(response.body.result.comments.principal).toBe(
          "Good performance. Keep improving.",
        );
      });

      test("requires authentication", async () => {
        const result = await createStoredResult({
          status: "submitted",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/approve`)
          .send({
            principalComment: "Approved.",
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      test("rejects an admin without results.approve permission", async () => {
        const result = await createStoredResult({
          status: "submitted",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/approve`)
          .set("Authorization", `Bearer ${secondAdminToken}`)
          .send({
            principalComment: "Approved.",
          });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      test("does not allow approval of a draft result", async () => {
        const result = await createStoredResult({
          status: "draft",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/approve`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            principalComment: "Approved.",
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/submitted/i);
      });

      test("does not allow approval of an already approved result", async () => {
        const result = await createStoredResult({
          status: "approved",
          principal: "Already approved.",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/approve`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            principalComment: "Approved again.",
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });

      test("does not allow approval of a published result", async () => {
        const result = await createStoredResult({
          status: "published",
          principal: "Already published.",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/approve`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            principalComment: "Attempted approval.",
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });

      test("requires principal comment", async () => {
        const result = await createStoredResult({
          status: "submitted",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/approve`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/principal comment/i);
      });

      test("rejects an empty principal comment", async () => {
        const result = await createStoredResult({
          status: "submitted",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/approve`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            principalComment: "",
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test("returns 404 for an unknown result", async () => {
        const response = await request(app)
          .patch(`${API}/results/${new mongoose.Types.ObjectId()}/approve`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            principalComment: "Approved.",
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe("PATCH /results/:id/principal-comment - updatePrincipalComment", () => {
      test("allows the principal to update a submitted result comment", async () => {
        const result = await createStoredResult({
          status: "submitted",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/principal-comment`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            principal: "Principal has reviewed this result.",
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        expect(response.body.result.comments.principal).toBe(
          "Principal has reviewed this result.",
        );
      });

      test("allows updating the principal comment on an approved result", async () => {
        const result = await createStoredResult({
          status: "approved",
          principal: "Initial principal comment.",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/principal-comment`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            principal: "Updated principal comment.",
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        expect(response.body.result.comments.principal).toBe(
          "Updated principal comment.",
        );
      });

      test("requires authentication", async () => {
        const result = await createStoredResult({
          status: "submitted",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/principal-comment`)
          .send({
            principal: "Comment.",
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      test("rejects an admin without results.approve permission", async () => {
        const result = await createStoredResult({
          status: "submitted",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/principal-comment`)
          .set("Authorization", `Bearer ${secondAdminToken}`)
          .send({
            principal: "Comment.",
          });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      test("does not allow principal comments on a draft", async () => {
        const result = await createStoredResult({
          status: "draft",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/principal-comment`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            principal: "Comment.",
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });

      test("does not allow principal comments on a published result", async () => {
        const result = await createStoredResult({
          status: "published",
          principal: "Published.",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/principal-comment`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            principal: "Attempted update.",
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });
    });

    describe("PATCH /results/:id/publish - publishResult", () => {
      test("publishes an approved result with confirmation", async () => {
        const result = await createStoredResult({
          status: "approved",
          principal: "Principal approved this result.",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/publish`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            confirm: true,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.result.status).toBe("published");
      });

      test("requires authentication", async () => {
        const result = await createStoredResult({
          status: "approved",
          principal: "Approved.",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/publish`)
          .send({
            confirm: true,
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      test("rejects an admin without results.publish permission", async () => {
        const result = await createStoredResult({
          status: "approved",
          principal: "Approved.",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/publish`)
          .set("Authorization", `Bearer ${secondAdminToken}`)
          .send({
            confirm: true,
          });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      test("does not allow publishing a draft result", async () => {
        const result = await createStoredResult({
          status: "draft",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/publish`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            confirm: true,
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/approved/i);
      });

      test("does not allow publishing a submitted result", async () => {
        const result = await createStoredResult({
          status: "submitted",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/publish`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            confirm: true,
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });

      test("does not allow publishing an already published result", async () => {
        const result = await createStoredResult({
          status: "published",
          principal: "Already published.",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/publish`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            confirm: true,
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });

      test("requires explicit publishing confirmation", async () => {
        const result = await createStoredResult({
          status: "approved",
          principal: "Approved.",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/publish`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            confirm: false,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test("rejects publishing without confirmation", async () => {
        const result = await createStoredResult({
          status: "approved",
          principal: "Approved.",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/publish`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test("requires principal comment before publishing", async () => {
        const result = await createStoredResult({
          status: "approved",
          principal: "",
        });

        const response = await request(app)
          .patch(`${API}/results/${result._id}/publish`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            confirm: true,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/principal comment/i);
      });

      test("returns 404 for an unknown result", async () => {
        const response = await request(app)
          .patch(`${API}/results/${new mongoose.Types.ObjectId()}/publish`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            confirm: true,
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe("COMPLETE FIRST TERM WORKFLOW", () => {
      test("moves a result from draft to submitted to approved to published", async () => {
        const createResponse = await request(app)
          .post(`${API}/results`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(
            buildCompleteResultBody({
              studentId: student.studentId,
              academicSessionId: academicSession._id,
              term: "first",
            }),
          );

        expect(createResponse.status).toBe(201);

        const resultId = createResponse.body.result._id;

        expect(createResponse.body.result.status).toBe("draft");

        const submitResponse = await request(app)
          .patch(`${API}/results/${resultId}/submit`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(submitResponse.status).toBe(200);
        expect(submitResponse.body.result.status).toBe("submitted");

        const approveResponse = await request(app)
          .patch(`${API}/results/${resultId}/approve`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            principalComment: "The result has been reviewed and approved.",
          });

        expect(approveResponse.status).toBe(200);
        expect(approveResponse.body.result.status).toBe("approved");

        const publishResponse = await request(app)
          .patch(`${API}/results/${resultId}/publish`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            confirm: true,
          });

        expect(publishResponse.status).toBe(200);
        expect(publishResponse.body.result.status).toBe("published");

        const finalResult = await Result.findById(resultId);

        expect(finalResult.status).toBe("published");
        expect(finalResult.comments.principal).toBe(
          "The result has been reviewed and approved.",
        );

        expect(finalResult.submittedBy).toBeDefined();
        expect(finalResult.submittedAt).toBeDefined();
        expect(finalResult.approvedBy).toBeDefined();
        expect(finalResult.approvedAt).toBeDefined();
        expect(finalResult.publishedBy).toBeDefined();
        expect(finalResult.publishedAt).toBeDefined();
      });
    });
  });
});

// ============================================================
// STAGE 3 — THIRD TERM & CUMULATIVE RESULT TESTING
// ============================================================

describe("RESULT API › THIRD TERM & CUMULATIVE RESULTS", () => {
  let stage3Admin;
  let stage3AdminToken;
  let stage3Student;
  let stage3AcademicSession;
  let stage3Subjects;

  beforeEach(async () => {
    stage3Admin = await createAdmin({
      fullName: "Stage 3 Admin",
      email: `stage3-${Date.now()}-${Math.random()}@test.com`,
      role: "super_admin",
    });

    stage3AdminToken = makeAdminToken(stage3Admin);

    stage3Student = await createStudent({
      studentId: `TCC3${Date.now()}${Math.floor(Math.random() * 1000)}`,
      firstName: "Stage",
      lastName: "Three",
      currentClass: "JSS1",
      session: "2025/2026",
    });

    stage3AcademicSession = await createAcademicSession({
      name: `Stage3-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    });

    const stage3Suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    stage3Subjects = await createSubjects([
      {
        name: `Mathematics Stage3 ${stage3Suffix}`,
        code: `MATH3-${stage3Suffix}`,
      },
      {
        name: `English Language Stage3 ${stage3Suffix}`,
        code: `ENG3-${stage3Suffix}`,
      },
      {
        name: `Basic Science Stage3 ${stage3Suffix}`,
        code: `SCI3-${stage3Suffix}`,
      },
    ]);
  });

  /**
   * Creates a complete result through the API.
   *
   * This helper is deliberately used for first and second
   * term results so that those results pass through the same
   * controller validation used in production.
   */
  const createTermResult = async ({ term, scores, status = "draft" }) => {
    const subjectResults = stage3Subjects.map((subject, index) => {
      const score = scores[index];

      return {
        subjectId: subject._id,
        offered: score.offered !== false,
        ca1: score.ca1,
        ca2: score.ca2,
        exam: score.exam,
        teacherComment:
          score.teacherComment || `${subject.name} teacher comment`,
      };
    });

    const body = buildCompleteResultBody({
      studentId: stage3Student.studentId,
      academicSessionId: stage3AcademicSession._id,
      term,
      subjectResults,
    });

    const response = await request(app)
      .post(`${API}/results`)
      .set("Authorization", `Bearer ${stage3AdminToken}`)
      .send(body);

    expect(response.status).toBe(201);

    const resultId = response.body.result._id;

    if (status === "submitted") {
      const submitResponse = await request(app)
        .patch(`${API}/results/${resultId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(submitResponse.status).toBe(200);
    }

    if (status === "approved") {
      const submitResponse = await request(app)
        .patch(`${API}/results/${resultId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(submitResponse.status).toBe(200);

      const approveResponse = await request(app)
        .patch(`${API}/results/${resultId}/approve`)
        .set("Authorization", `Bearer ${stage3AdminToken}`)
        .send({
          principalComment: "Result reviewed and approved.",
        });

      expect(approveResponse.status).toBe(200);
    }

    if (status === "published") {
      const submitResponse = await request(app)
        .patch(`${API}/results/${resultId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(submitResponse.status).toBe(200);

      const approveResponse = await request(app)
        .patch(`${API}/results/${resultId}/approve`)
        .set("Authorization", `Bearer ${stage3AdminToken}`)
        .send({
          principalComment: "Result reviewed and approved.",
        });

      expect(approveResponse.status).toBe(200);

      const publishResponse = await request(app)
        .patch(`${API}/results/${resultId}/publish`)
        .set("Authorization", `Bearer ${stage3AdminToken}`)
        .send({
          confirm: true,
        });

      expect(publishResponse.status).toBe(200);
    }

    return Result.findById(resultId);
  };

  /**
   * Creates a third-term draft.
   */
  const createThirdTermDraft = async ({ scores }) => {
    const subjectResults = stage3Subjects.map((subject, index) => {
      const score = scores[index];

      return {
        subjectId: subject._id,
        offered: score.offered !== false,
        ca1: score.ca1,
        ca2: score.ca2,
        exam: score.exam,
        teacherComment:
          score.teacherComment || `${subject.name} third term comment`,
      };
    });

    const body = buildCompleteResultBody({
      studentId: stage3Student.studentId,
      academicSessionId: stage3AcademicSession._id,
      term: "third",
      subjectResults,
    });

    const response = await request(app)
      .post(`${API}/results`)
      .set("Authorization", `Bearer ${stage3AdminToken}`)
      .send(body);

    expect(response.status).toBe(201);

    return response.body.result._id;
  };

  // ----------------------------------------------------------
  // 1. THIRD TERM REQUIRES PREVIOUS TERMS
  // ----------------------------------------------------------

  describe("THIRD TERM PREVIOUS-TERM REQUIREMENTS", () => {
    test("rejects third-term submission when first-term result is missing", async () => {
      await createTermResult({
        term: "second",
        scores: [
          {
            ca1: 15,
            ca2: 8,
            exam: 60,
          },
          {
            ca1: 14,
            ca2: 7,
            exam: 58,
          },
          {
            ca1: 16,
            ca2: 9,
            exam: 61,
          },
        ],
        status: "published",
      });

      const thirdTermId = await createThirdTermDraft({
        scores: [
          {
            ca1: 16,
            ca2: 9,
            exam: 65,
          },
          {
            ca1: 15,
            ca2: 8,
            exam: 63,
          },
          {
            ca1: 17,
            ca2: 9,
            exam: 64,
          },
        ],
      });

      const response = await request(app)
        .patch(`${API}/results/${thirdTermId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("rejects third-term submission when second-term result is missing", async () => {
      await createTermResult({
        term: "first",
        scores: [
          {
            ca1: 15,
            ca2: 8,
            exam: 60,
          },
          {
            ca1: 14,
            ca2: 7,
            exam: 58,
          },
          {
            ca1: 16,
            ca2: 9,
            exam: 61,
          },
        ],
        status: "published",
      });

      const thirdTermId = await createThirdTermDraft({
        scores: [
          {
            ca1: 16,
            ca2: 9,
            exam: 65,
          },
          {
            ca1: 15,
            ca2: 8,
            exam: 63,
          },
          {
            ca1: 17,
            ca2: 9,
            exam: 64,
          },
        ],
      });

      const response = await request(app)
        .patch(`${API}/results/${thirdTermId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 2. THREE-TERM CUMULATIVE CALCULATION
  // ----------------------------------------------------------

  describe("THREE-TERM CUMULATIVE CALCULATION", () => {
    test("calculates cumulative score and weighted average across three terms", async () => {
      const firstTerm = await createTermResult({
        term: "first",
        scores: [
          {
            ca1: 15,
            ca2: 8,
            exam: 57,
          },
          {
            ca1: 14,
            ca2: 7,
            exam: 59,
          },
          {
            ca1: 16,
            ca2: 8,
            exam: 56,
          },
        ],
        status: "published",
      });

      const secondTerm = await createTermResult({
        term: "second",
        scores: [
          {
            ca1: 16,
            ca2: 9,
            exam: 60,
          },
          {
            ca1: 15,
            ca2: 8,
            exam: 61,
          },
          {
            ca1: 17,
            ca2: 9,
            exam: 58,
          },
        ],
        status: "published",
      });

      const thirdTermId = await createThirdTermDraft({
        scores: [
          {
            ca1: 17,
            ca2: 9,
            exam: 64,
          },
          {
            ca1: 16,
            ca2: 8,
            exam: 65,
          },
          {
            ca1: 18,
            ca2: 9,
            exam: 63,
          },
        ],
      });

      const submitResponse = await request(app)
        .patch(`${API}/results/${thirdTermId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(submitResponse.status).toBe(200);

      const result = await Result.findById(thirdTermId);

      expect(result).toBeTruthy();

      const mathematics = result.subjectResults.find(
        (subjectResult) => subjectResult.subjectName === stage3Subjects[0].name,
      );

      expect(mathematics).toBeTruthy();

      expect(mathematics).toBeTruthy();

      /*
       * Mathematics:
       *
       * First:
       * 15 + 8 + 57 = 80
       *
       * Second:
       * 16 + 9 + 60 = 85
       *
       * Third:
       * 17 + 9 + 64 = 90
       *
       * Cumulative:
       * 80 + 85 + 90 = 255
       *
       * Weighted average:
       * 255 / 3 = 85
       */

      expect(mathematics.firstTerm.total).toBe(80);
      expect(mathematics.secondTerm.total).toBe(85);
      expect(mathematics.total).toBe(90);
      expect(mathematics.cumulativeScore).toBe(255);
      expect(mathematics.weightedAverage).toBe(85);
      expect(mathematics.grade).toBe("D");

      expect(firstTerm.status).toBe("published");
      expect(secondTerm.status).toBe("published");
    });
  });

  // ----------------------------------------------------------
  // 3. SUBJECT NOT OFFERED IN ONE TERM
  // ----------------------------------------------------------

  describe("SUBJECT OFFERING ACROSS TERMS", () => {
    test("excludes a subject that was not offered in one term from its weighted average", async () => {
      await createTermResult({
        term: "first",
        scores: [
          {
            ca1: 15,
            ca2: 8,
            exam: 57,
          },
          {
            ca1: 14,
            ca2: 7,
            exam: 59,
          },
          {
            ca1: 16,
            ca2: 8,
            exam: 56,
          },
        ],
        status: "published",
      });

      await createTermResult({
        term: "second",
        scores: [
          {
            ca1: 16,
            ca2: 9,
            exam: 60,
          },
          {
            ca1: 15,
            ca2: 8,
            exam: 61,
          },
          {
            offered: false,
            ca1: null,
            ca2: null,
            exam: null,
          },
        ],
        status: "published",
      });

      const thirdTermId = await createThirdTermDraft({
        scores: [
          {
            ca1: 17,
            ca2: 9,
            exam: 64,
          },
          {
            ca1: 16,
            ca2: 8,
            exam: 65,
          },
          {
            ca1: 18,
            ca2: 9,
            exam: 63,
          },
        ],
      });

      const submitResponse = await request(app)
        .patch(`${API}/results/${thirdTermId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(submitResponse.status).toBe(200);

      const result = await Result.findById(thirdTermId);

      const science = result.subjectResults.find(
        (subjectResult) => subjectResult.subjectName === stage3Subjects[2].name,
      );

      expect(science).toBeTruthy();

      expect(science.firstTerm.offered).toBe(true);
      expect(science.secondTerm.offered).toBe(false);

      expect(science.firstTerm.total).toBe(80);
      expect(science.secondTerm.total).toBeNull();

      expect(science.offered).toBe(true);
      expect(science.total).toBe(90);

      expect(science.cumulativeScore).toBe(170);
      expect(science.weightedAverage).toBe(85);

      /*
       * Basic Science:
       *
       * First = 80
       * Second = not offered
       * Third = 90
       *
       * Applicable terms = 2
       *
       * Weighted average = 170 / 2 = 85
       */

      expect(science.firstTerm.offered).toBe(true);
      expect(science.secondTerm.offered).toBe(false);
      expect(science.total).toBe(90);
      expect(science.cumulativeScore).toBe(170);
      expect(science.weightedAverage).toBe(85);
    });

    test("counts zero when a subject is offered and the student scores zero", async () => {
      await createTermResult({
        term: "first",
        scores: [
          {
            ca1: 0,
            ca2: 0,
            exam: 0,
          },
          {
            ca1: 14,
            ca2: 7,
            exam: 59,
          },
          {
            ca1: 16,
            ca2: 8,
            exam: 56,
          },
        ],
        status: "published",
      });

      await createTermResult({
        term: "second",
        scores: [
          {
            ca1: 0,
            ca2: 0,
            exam: 0,
          },
          {
            ca1: 15,
            ca2: 8,
            exam: 61,
          },
          {
            ca1: 17,
            ca2: 9,
            exam: 58,
          },
        ],
        status: "published",
      });

      const thirdTermId = await createThirdTermDraft({
        scores: [
          {
            ca1: 0,
            ca2: 0,
            exam: 0,
          },
          {
            ca1: 16,
            ca2: 8,
            exam: 65,
          },
          {
            ca1: 18,
            ca2: 9,
            exam: 63,
          },
        ],
      });

      const submitResponse = await request(app)
        .patch(`${API}/results/${thirdTermId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(submitResponse.status).toBe(200);

      const result = await Result.findById(thirdTermId);

      const mathematics = result.subjectResults.find(
        (subjectResult) => subjectResult.subjectName === stage3Subjects[0].name,
      );

      expect(mathematics).toBeTruthy();

      expect(mathematics.firstTerm.offered).toBe(true);
      expect(mathematics.secondTerm.offered).toBe(true);

      expect(mathematics.cumulativeScore).toBe(0);
      expect(mathematics.weightedAverage).toBe(0);
      expect(mathematics.grade).toBe("F");
    });
  });

  // ----------------------------------------------------------
  // 4. DYNAMIC OVERALL DENOMINATOR
  // ----------------------------------------------------------

  describe("THIRD TERM OVERALL PERCENTAGE", () => {
    test("uses only applicable offered subject-terms in the overall denominator", async () => {
      await createTermResult({
        term: "first",
        scores: [
          {
            ca1: 15,
            ca2: 8,
            exam: 57,
          },
          {
            ca1: 14,
            ca2: 7,
            exam: 59,
          },
          {
            ca1: 16,
            ca2: 8,
            exam: 56,
          },
        ],
        status: "published",
      });

      await createTermResult({
        term: "second",
        scores: [
          {
            ca1: 16,
            ca2: 9,
            exam: 60,
          },
          {
            ca1: 15,
            ca2: 8,
            exam: 61,
          },
          {
            offered: false,
            ca1: null,
            ca2: null,
            exam: null,
          },
        ],
        status: "published",
      });

      const thirdTermId = await createThirdTermDraft({
        scores: [
          {
            ca1: 17,
            ca2: 9,
            exam: 64,
          },
          {
            ca1: 16,
            ca2: 8,
            exam: 65,
          },
          {
            ca1: 18,
            ca2: 9,
            exam: 63,
          },
        ],
      });

      const submitResponse = await request(app)
        .patch(`${API}/results/${thirdTermId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(submitResponse.status).toBe(200);

      const result = await Result.findById(thirdTermId);

      /*
       * Applicable subject-terms:
       *
       * Mathematics:
       * First + Second + Third = 255
       *
       * English:
       * First + Second + Third = 260
       *
       * Basic Science:
       * First + Third = 170
       *
       * Total obtained = 685
       *
       * Applicable subject-terms:
       * 3 + 3 + 2 = 8
       *
       * Total obtainable:
       * 8 × 100 = 800
       *
       * Overall percentage:
       * 685 / 800 × 100 = 85.625
       */

      expect(result.totalScore).toBe(678);
      expect(result.totalObtainableMarks).toBe(800);
      expect(result.overallPercentage).toBe(84.75);
    });
  });

  // ----------------------------------------------------------
  // 5. PROMOTION RECOMMENDATION
  // ----------------------------------------------------------

  describe("THIRD TERM PROMOTION RECOMMENDATION", () => {
    test("recommends promotion when overall percentage is exactly 50", async () => {
      await createTermResult({
        term: "first",
        scores: [
          {
            ca1: 10,
            ca2: 5,
            exam: 35,
          },
          {
            ca1: 10,
            ca2: 5,
            exam: 35,
          },
          {
            ca1: 10,
            ca2: 5,
            exam: 35,
          },
        ],
        status: "published",
      });

      await createTermResult({
        term: "second",
        scores: [
          {
            ca1: 10,
            ca2: 5,
            exam: 35,
          },
          {
            ca1: 10,
            ca2: 5,
            exam: 35,
          },
          {
            ca1: 10,
            ca2: 5,
            exam: 35,
          },
        ],
        status: "published",
      });

      const thirdTermId = await createThirdTermDraft({
        scores: [
          {
            ca1: 10,
            ca2: 5,
            exam: 35,
          },
          {
            ca1: 10,
            ca2: 5,
            exam: 35,
          },
          {
            ca1: 10,
            ca2: 5,
            exam: 35,
          },
        ],
      });

      const submitResponse = await request(app)
        .patch(`${API}/results/${thirdTermId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(submitResponse.status).toBe(200);

      const result = await Result.findById(thirdTermId);

      expect(result.overallPercentage).toBe(50);
      expect(result.promotionStatus).toBe("recommended_promoted");
    });

    test("recommends repeat when overall percentage is below 50", async () => {
      await createTermResult({
        term: "first",
        scores: [
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
        ],
        status: "published",
      });

      await createTermResult({
        term: "second",
        scores: [
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
        ],
        status: "published",
      });

      const thirdTermId = await createThirdTermDraft({
        scores: [
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
        ],
      });

      const submitResponse = await request(app)
        .patch(`${API}/results/${thirdTermId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(submitResponse.status).toBe(200);

      const result = await Result.findById(thirdTermId);

      expect(result.overallPercentage).toBe(40);
      expect(result.promotionStatus).toBe("recommended_repeat");
    });
  });

  // ----------------------------------------------------------
  // 6. PRINCIPAL DECISION
  // ----------------------------------------------------------

  describe("THIRD TERM PRINCIPAL DECISION", () => {
    test("requires an explicit principal decision when approving third term", async () => {
      await createTermResult({
        term: "first",
        scores: [
          {
            ca1: 15,
            ca2: 8,
            exam: 57,
          },
          {
            ca1: 14,
            ca2: 7,
            exam: 59,
          },
          {
            ca1: 16,
            ca2: 8,
            exam: 56,
          },
        ],
        status: "published",
      });

      await createTermResult({
        term: "second",
        scores: [
          {
            ca1: 16,
            ca2: 9,
            exam: 60,
          },
          {
            ca1: 15,
            ca2: 8,
            exam: 61,
          },
          {
            ca1: 17,
            ca2: 9,
            exam: 58,
          },
        ],
        status: "published",
      });

      const thirdTermId = await createThirdTermDraft({
        scores: [
          {
            ca1: 17,
            ca2: 9,
            exam: 64,
          },
          {
            ca1: 16,
            ca2: 8,
            exam: 65,
          },
          {
            ca1: 18,
            ca2: 9,
            exam: 63,
          },
        ],
      });

      const submitResponse = await request(app)
        .patch(`${API}/results/${thirdTermId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(submitResponse.status).toBe(200);

      const approveResponse = await request(app)
        .patch(`${API}/results/${thirdTermId}/approve`)
        .set("Authorization", `Bearer ${stage3AdminToken}`)
        .send({
          principalComment: "Third term result reviewed.",
        });

      expect(approveResponse.status).toBe(400);
      expect(approveResponse.body.success).toBe(false);

      const result = await Result.findById(thirdTermId);

      expect(result.status).toBe("submitted");
      expect(result.principalDecision).toBe("pending");
    });

    test("stores principal decision separately from system recommendation", async () => {
      await createTermResult({
        term: "first",
        scores: [
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
        ],
        status: "published",
      });

      await createTermResult({
        term: "second",
        scores: [
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
        ],
        status: "published",
      });

      const thirdTermId = await createThirdTermDraft({
        scores: [
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
          {
            ca1: 5,
            ca2: 5,
            exam: 30,
          },
        ],
      });

      const submitResponse = await request(app)
        .patch(`${API}/results/${thirdTermId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(submitResponse.status).toBe(200);

      const resultBeforeApproval = await Result.findById(thirdTermId);

      expect(resultBeforeApproval.promotionStatus).toBe("recommended_repeat");

      const approveResponse = await request(app)
        .patch(`${API}/results/${thirdTermId}/approve`)
        .set("Authorization", `Bearer ${stage3AdminToken}`)
        .send({
          principalComment:
            "Principal reviewed the student's overall performance.",
          principalDecision: "promoted",
        });

      expect(approveResponse.status).toBe(200);

      const result = await Result.findById(thirdTermId);

      expect(result.status).toBe("approved");

      // System recommendation remains repeat.
      expect(result.promotionStatus).toBe("recommended_repeat");

      // Principal's final decision is separately recorded.
      expect(result.principalDecision).toBe("promoted");
    });
  });

  // ----------------------------------------------------------
  // 7. PREVIOUS RESULT HISTORY MUST NOT CHANGE
  // ----------------------------------------------------------

  describe("THIRD TERM HISTORY PRESERVATION", () => {
    test("does not modify first and second term results when third term is calculated", async () => {
      const firstTerm = await createTermResult({
        term: "first",
        scores: [
          {
            ca1: 15,
            ca2: 8,
            exam: 57,
          },
          {
            ca1: 14,
            ca2: 7,
            exam: 59,
          },
          {
            ca1: 16,
            ca2: 8,
            exam: 56,
          },
        ],
        status: "published",
      });

      const secondTerm = await createTermResult({
        term: "second",
        scores: [
          {
            ca1: 16,
            ca2: 9,
            exam: 60,
          },
          {
            ca1: 15,
            ca2: 8,
            exam: 61,
          },
          {
            ca1: 17,
            ca2: 9,
            exam: 58,
          },
        ],
        status: "published",
      });

      const firstTermSnapshot = await Result.findById(firstTerm._id).lean();

      const secondTermSnapshot = await Result.findById(secondTerm._id).lean();

      const thirdTermId = await createThirdTermDraft({
        scores: [
          {
            ca1: 17,
            ca2: 9,
            exam: 64,
          },
          {
            ca1: 16,
            ca2: 8,
            exam: 65,
          },
          {
            ca1: 18,
            ca2: 9,
            exam: 63,
          },
        ],
      });

      const submitResponse = await request(app)
        .patch(`${API}/results/${thirdTermId}/submit`)
        .set("Authorization", `Bearer ${stage3AdminToken}`);

      expect(submitResponse.status).toBe(200);

      const firstTermAfter = await Result.findById(firstTerm._id).lean();

      const secondTermAfter = await Result.findById(secondTerm._id).lean();

      expect(firstTermAfter.status).toBe(firstTermSnapshot.status);

      expect(secondTermAfter.status).toBe(secondTermSnapshot.status);

      expect(firstTermAfter.totalScore).toBe(firstTermSnapshot.totalScore);

      expect(secondTermAfter.totalScore).toBe(secondTermSnapshot.totalScore);
    });
  });
});
