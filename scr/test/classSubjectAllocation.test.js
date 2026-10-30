const request = require("supertest");

const app = require("../app");

const Admin = require("../models/Admin");
const SchoolClass = require("../models/SchoolClass");
const Department = require("../models/Department");
const Subject = require("../models/Subject");
const ClassSubjectAllocation = require("../models/ClassSubjectAllocation");

const generateToken = require("../utils/generateToken");

describe("CLASS-SUBJECT ALLOCATION API", () => {
  let admin;
  let token;

  let jss1;
  let ss1;
  let arts;
  let science;
  let mathematics;
  let english;
  let biology;

  const auth = () => ({
    Authorization: `Bearer ${token}`,
  });

  const createAllocation = async (overrides = {}) => {
    return ClassSubjectAllocation.create({
      schoolClass: jss1._id,
      department: null,
      subject: mathematics._id,
      createdBy: admin._id,
      updatedBy: admin._id,
      ...overrides,
    });
  };

  beforeEach(async () => {
    admin = await Admin.create({
      fullName: "Allocation Administrator",
      email: "allocation-admin@test.com",
      password: "Password123!",
      role: "admin",
      permissions: [
        "class-subject-allocations.view",
        "class-subject-allocations.create",
        "class-subject-allocations.update",
      ],
      isActive: true,
    });

    token = generateToken(admin);

    [jss1, ss1] = await SchoolClass.create([
      {
        name: "JSS1",
        level: "junior",
        hasDepartments: false,
      },
      {
        name: "SS1",
        level: "senior",
        hasDepartments: true,
      },
    ]);

    [arts, science] = await Department.create([
      {
        name: "Arts",
        code: "ART",
      },
      {
        name: "Science",
        code: "SCI",
      },
    ]);

    [mathematics, english, biology] = await Subject.create([
      {
        name: "Mathematics",
        code: "MTH",
      },
      {
        name: "English Language",
        code: "ENG",
      },
      {
        name: "Biology",
        code: "BIO",
      },
    ]);
  });

  /*
  |--------------------------------------------------------------------------
  | OPTIONS
  |--------------------------------------------------------------------------
  */

  describe("GET /api/v1/class-subject-allocations/options", () => {
    test("returns active classes, departments and subjects", async () => {
      const response = await request(app)
        .get("/api/v1/class-subject-allocations/options")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.options.classes).toHaveLength(2);
      expect(response.body.options.departments).toHaveLength(2);
      expect(response.body.options.subjects).toHaveLength(3);
    });

    test("does not return inactive classes, departments or subjects", async () => {
      await SchoolClass.create({
        name: "JSS2",
        level: "junior",
        hasDepartments: false,
        isActive: false,
      });

      const inactiveDepartment = await Department.create({
        name: "Commercial",
        code: "COM",
        isActive: false,
      });

      const inactiveSubject = await Subject.create({
        name: "Economics",
        code: "ECO",
        isActive: false,
      });

      const response = await request(app)
        .get("/api/v1/class-subject-allocations/options")
        .set(auth());

      expect(response.statusCode).toBe(200);

      expect(
        response.body.options.classes.some((item) => item.name === "JSS2"),
      ).toBe(false);

      expect(
        response.body.options.departments.some(
          (item) => item._id === inactiveDepartment._id.toString(),
        ),
      ).toBe(false);

      expect(
        response.body.options.subjects.some(
          (item) => item._id === inactiveSubject._id.toString(),
        ),
      ).toBe(false);
    });

    test("rejects an admin without view permission", async () => {
      const restrictedAdmin = await Admin.create({
        fullName: "Restricted Admin",
        email: "restricted-options@test.com",
        password: "Password123!",
        role: "admin",
        permissions: [],
      });

      const restrictedToken = generateToken(restrictedAdmin);

      const response = await request(app)
        .get("/api/v1/class-subject-allocations/options")
        .set("Authorization", `Bearer ${restrictedToken}`);

      expect(response.statusCode).toBe(403);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | CREATE ALLOCATION
  |--------------------------------------------------------------------------
  */

  describe("POST /api/v1/class-subject-allocations", () => {
    test("allocates a subject to a junior class without a department", async () => {
      const response = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set(auth())
        .send({
          schoolClass: jss1._id.toString(),
          subject: mathematics._id.toString(),
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.allocation.schoolClass.name).toBe("JSS1");
      expect(response.body.allocation.subject.name).toBe("Mathematics");
      expect(response.body.allocation.department).toBeNull();
      expect(response.body.allocation.isActive).toBe(true);
    });

    test("allocates a subject to a senior class and department", async () => {
      const response = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set(auth())
        .send({
          schoolClass: ss1._id.toString(),
          department: arts._id.toString(),
          subject: mathematics._id.toString(),
        });

      expect(response.statusCode).toBe(201);

      expect(response.body.allocation.schoolClass.name).toBe("SS1");
      expect(response.body.allocation.department.name).toBe("Arts");
      expect(response.body.allocation.subject.name).toBe("Mathematics");
    });

    test("allows the same general subject in different departments", async () => {
      const artsResponse = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set(auth())
        .send({
          schoolClass: ss1._id.toString(),
          department: arts._id.toString(),
          subject: mathematics._id.toString(),
        });

      const scienceResponse = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set(auth())
        .send({
          schoolClass: ss1._id.toString(),
          department: science._id.toString(),
          subject: mathematics._id.toString(),
        });

      expect(artsResponse.statusCode).toBe(201);
      expect(scienceResponse.statusCode).toBe(201);

      expect(artsResponse.body.allocation.subject._id).toBe(
        scienceResponse.body.allocation.subject._id,
      );

      expect(artsResponse.body.allocation.department.name).toBe("Arts");
      expect(scienceResponse.body.allocation.department.name).toBe("Science");

      expect(await ClassSubjectAllocation.countDocuments()).toBe(2);
    });

    test("rejects a senior allocation without a department", async () => {
      const response = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set(auth())
        .send({
          schoolClass: ss1._id.toString(),
          subject: mathematics._id.toString(),
        });

      expect(response.statusCode).toBe(400);
      expect(await ClassSubjectAllocation.countDocuments()).toBe(0);
    });

    test("rejects a junior allocation with a department", async () => {
      const response = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set(auth())
        .send({
          schoolClass: jss1._id.toString(),
          department: arts._id.toString(),
          subject: mathematics._id.toString(),
        });

      expect(response.statusCode).toBe(400);
      expect(await ClassSubjectAllocation.countDocuments()).toBe(0);
    });

    test("rejects duplicate allocations in the same class and department", async () => {
      await createAllocation();

      const response = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set(auth())
        .send({
          schoolClass: jss1._id.toString(),
          subject: mathematics._id.toString(),
        });

      expect(response.statusCode).toBe(409);
      expect(await ClassSubjectAllocation.countDocuments()).toBe(1);
    });

    test("rejects missing class or subject", async () => {
      const response = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set(auth())
        .send({
          schoolClass: jss1._id.toString(),
        });

      expect(response.statusCode).toBe(400);
    });

    test("rejects invalid class IDs", async () => {
      const response = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set(auth())
        .send({
          schoolClass: "invalid-id",
          subject: mathematics._id.toString(),
        });

      expect(response.statusCode).toBe(400);
    });

    test("rejects nonexistent classes", async () => {
      const response = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set(auth())
        .send({
          schoolClass: "68c123456789abcdef123456",
          subject: mathematics._id.toString(),
        });

      expect(response.statusCode).toBe(404);
    });

    test("rejects inactive subjects", async () => {
      const inactiveSubject = await Subject.create({
        name: "Inactive Subject",
        code: "INA",
        isActive: false,
      });

      const response = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set(auth())
        .send({
          schoolClass: jss1._id.toString(),
          subject: inactiveSubject._id.toString(),
        });

      expect(response.statusCode).toBe(404);
    });

    test("rejects inactive departments", async () => {
      const inactiveDepartment = await Department.create({
        name: "Commercial",
        code: "COM",
        isActive: false,
      });

      const response = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set(auth())
        .send({
          schoolClass: ss1._id.toString(),
          department: inactiveDepartment._id.toString(),
          subject: mathematics._id.toString(),
        });

      expect(response.statusCode).toBe(404);
    });

    test("rejects an admin without create permission", async () => {
      const restrictedAdmin = await Admin.create({
        fullName: "Restricted Creator",
        email: "restricted-creator@test.com",
        password: "Password123!",
        role: "admin",
        permissions: [],
      });

      const restrictedToken = generateToken(restrictedAdmin);

      const response = await request(app)
        .post("/api/v1/class-subject-allocations")
        .set("Authorization", `Bearer ${restrictedToken}`)
        .send({
          schoolClass: jss1._id.toString(),
          subject: mathematics._id.toString(),
        });

      expect(response.statusCode).toBe(403);
    });

    test("rejects unauthenticated allocation creation", async () => {
      const response = await request(app)
        .post("/api/v1/class-subject-allocations")
        .send({
          schoolClass: jss1._id.toString(),
          subject: mathematics._id.toString(),
        });

      expect(response.statusCode).toBe(401);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | GET ALLOCATIONS
  |--------------------------------------------------------------------------
  */

  describe("GET /api/v1/class-subject-allocations", () => {
    test("returns active allocations by default", async () => {
      await createAllocation();

      await createAllocation({
        subject: english._id,
        isActive: false,
      });

      const response = await request(app)
        .get("/api/v1/class-subject-allocations")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.allocations).toHaveLength(1);
      expect(response.body.allocations[0].subject.name).toBe("Mathematics");
    });

    test("returns inactive allocations when status=inactive", async () => {
      await createAllocation({
        isActive: false,
      });

      const response = await request(app)
        .get("/api/v1/class-subject-allocations?status=inactive")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.allocations).toHaveLength(1);
      expect(response.body.allocations[0].isActive).toBe(false);
    });

    test("returns all allocations when status=all", async () => {
      await createAllocation();

      await createAllocation({
        subject: english._id,
        isActive: false,
      });

      const response = await request(app)
        .get("/api/v1/class-subject-allocations?status=all")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.allocations).toHaveLength(2);
    });

    test("filters allocations by class", async () => {
      await createAllocation();

      const response = await request(app)
        .get(`/api/v1/class-subject-allocations?classId=${jss1._id}`)
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.allocations).toHaveLength(1);
    });

    test("filters junior allocations without a department", async () => {
      await createAllocation();

      const response = await request(app)
        .get("/api/v1/class-subject-allocations?departmentId=none")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.allocations).toHaveLength(1);
      expect(response.body.allocations[0].department).toBeNull();
    });

    test("filters allocations by department", async () => {
      await createAllocation({
        schoolClass: ss1._id,
        department: arts._id,
      });

      const response = await request(app)
        .get(`/api/v1/class-subject-allocations?departmentId=${arts._id}`)
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.allocations).toHaveLength(1);
      expect(response.body.allocations[0].department.name).toBe("Arts");
    });

    test("supports pagination", async () => {
      await createAllocation();

      await createAllocation({
        subject: english._id,
      });

      await createAllocation({
        subject: biology._id,
      });

      const response = await request(app)
        .get("/api/v1/class-subject-allocations?page=1&limit=2")
        .set(auth());

      expect(response.statusCode).toBe(200);
      expect(response.body.allocations).toHaveLength(2);

      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.totalAllocations).toBe(3);
      expect(response.body.pagination.totalPages).toBe(2);
    });

    test("rejects invalid status filters", async () => {
      const response = await request(app)
        .get("/api/v1/class-subject-allocations?status=deleted")
        .set(auth());

      expect(response.statusCode).toBe(400);
    });

    test("rejects invalid class filter IDs", async () => {
      const response = await request(app)
        .get("/api/v1/class-subject-allocations?classId=invalid")
        .set(auth());

      expect(response.statusCode).toBe(400);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | ACTIVATE / DEACTIVATE ALLOCATION
  |--------------------------------------------------------------------------
  */

  describe("PATCH /api/v1/class-subject-allocations/:id/status", () => {
    test("deactivates an allocation without deleting it", async () => {
      const allocation = await createAllocation();

      const response = await request(app)
        .patch(`/api/v1/class-subject-allocations/${allocation._id}/status`)
        .set(auth())
        .send({
          isActive: false,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.allocation.isActive).toBe(false);

      const savedAllocation = await ClassSubjectAllocation.findById(
        allocation._id,
      );

      expect(savedAllocation).toBeTruthy();
      expect(savedAllocation.isActive).toBe(false);
    });

    test("reactivates an allocation", async () => {
      const allocation = await createAllocation({
        isActive: false,
      });

      const response = await request(app)
        .patch(`/api/v1/class-subject-allocations/${allocation._id}/status`)
        .set(auth())
        .send({
          isActive: true,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.allocation.isActive).toBe(true);
    });

    test("rejects non-boolean status values", async () => {
      const allocation = await createAllocation();

      const response = await request(app)
        .patch(`/api/v1/class-subject-allocations/${allocation._id}/status`)
        .set(auth())
        .send({
          isActive: "false",
        });

      expect(response.statusCode).toBe(400);
    });

    test("returns 404 for nonexistent allocations", async () => {
      const response = await request(app)
        .patch(
          "/api/v1/class-subject-allocations/68c123456789abcdef123456/status",
        )
        .set(auth())
        .send({
          isActive: false,
        });

      expect(response.statusCode).toBe(404);
    });

    test("rejects an admin without update permission", async () => {
      const allocation = await createAllocation();

      const restrictedAdmin = await Admin.create({
        fullName: "Restricted Updater",
        email: "restricted-updater@test.com",
        password: "Password123!",
        role: "admin",
        permissions: [],
      });

      const restrictedToken = generateToken(restrictedAdmin);

      const response = await request(app)
        .patch(`/api/v1/class-subject-allocations/${allocation._id}/status`)
        .set("Authorization", `Bearer ${restrictedToken}`)
        .send({
          isActive: false,
        });

      expect(response.statusCode).toBe(403);
    });
  });
});
