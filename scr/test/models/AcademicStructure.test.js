const SchoolClass = require("../../models/SchoolClass");
const Department = require("../../models/Department");

describe("Academic Structure Models", () => {
  beforeAll(async () => {
    await SchoolClass.init();
    await Department.init();
  });

  describe("SchoolClass", () => {
    const validClasses = [
      { name: "JSS1", level: "junior", hasDepartments: false },
      { name: "JSS2", level: "junior", hasDepartments: false },
      { name: "JSS3", level: "junior", hasDepartments: false },
      { name: "SS1", level: "senior", hasDepartments: true },
      { name: "SS2", level: "senior", hasDepartments: true },
      { name: "SS3", level: "senior", hasDepartments: true },
    ];

    test("accepts all six school classes", async () => {
      for (const item of validClasses) {
        const schoolClass = new SchoolClass(item);

        await expect(schoolClass.validate()).resolves.toBeUndefined();
      }
    });

    test("rejects a JSS class with departments enabled", async () => {
      const schoolClass = new SchoolClass({
        name: "JSS1",
        level: "junior",
        hasDepartments: true,
      });

      await expect(schoolClass.validate()).rejects.toThrow();
    });

    test("rejects an SS class without departments", async () => {
      const schoolClass = new SchoolClass({
        name: "SS1",
        level: "senior",
        hasDepartments: false,
      });

      await expect(schoolClass.validate()).rejects.toThrow();
    });

    test("rejects an incorrect class level", async () => {
      const schoolClass = new SchoolClass({
        name: "SS1",
        level: "junior",
        hasDepartments: true,
      });

      await expect(schoolClass.validate()).rejects.toThrow();
    });

    test("prevents duplicate class names", async () => {
      await SchoolClass.create(validClasses[0]);

      await expect(SchoolClass.create(validClasses[0])).rejects.toMatchObject({
        code: 11000,
      });
    });
  });

  describe("Department", () => {
    const validDepartments = [
      { name: "Arts", code: "ART" },
      { name: "Science", code: "SCI" },
      { name: "Commercial", code: "COM" },
    ];

    test("accepts all three departments", async () => {
      for (const item of validDepartments) {
        const department = new Department(item);

        await expect(department.validate()).resolves.toBeUndefined();
      }
    });

    test("rejects an unsupported department", async () => {
      const department = new Department({
        name: "Technology",
        code: "TECH",
      });

      await expect(department.validate()).rejects.toThrow();
    });

    test("prevents duplicate department codes", async () => {
      await Department.create(validDepartments[0]);

      await expect(
        Department.create(validDepartments[0]),
      ).rejects.toMatchObject({
        code: 11000,
      });
    });
  });
});
