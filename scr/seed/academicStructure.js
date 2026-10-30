require("dotenv").config();

const mongoose = require("mongoose");

const SchoolClass = require("../models/SchoolClass");
const Department = require("../models/Department");

const classes = [
  { name: "JSS1", level: "junior", hasDepartments: false },
  { name: "JSS2", level: "junior", hasDepartments: false },
  { name: "JSS3", level: "junior", hasDepartments: false },

  { name: "SS1", level: "senior", hasDepartments: true },
  { name: "SS2", level: "senior", hasDepartments: true },
  { name: "SS3", level: "senior", hasDepartments: true },
];

const departments = [
  { name: "Arts", code: "ART" },
  { name: "Science", code: "SCI" },
  { name: "Commercial", code: "COM" },
];

const seedAcademicStructure = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from environment variables.");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB.");

    console.log("\nSeeding school classes...");

    for (const schoolClass of classes) {
      const existing = await SchoolClass.findOne({
        name: schoolClass.name,
      });

      if (existing) {
        const matches =
          existing.level === schoolClass.level &&
          existing.hasDepartments === schoolClass.hasDepartments;

        if (!matches) {
          throw new Error(
            `Existing class configuration conflicts with ${schoolClass.name}.`,
          );
        }

        console.log(`Skipped existing class: ${schoolClass.name}`);
        continue;
      }

      await SchoolClass.create(schoolClass);

      console.log(`Created class: ${schoolClass.name}`);
    }

    console.log("\nSeeding departments...");

    for (const department of departments) {
      const existing = await Department.findOne({
        $or: [{ code: department.code }, { name: department.name }],
      });

      if (existing) {
        if (
          existing.code !== department.code ||
          existing.name !== department.name
        ) {
          throw new Error(
            `Existing department configuration conflicts with ${department.name}.`,
          );
        }

        console.log(`Skipped existing department: ${department.name}`);
        continue;
      }

      await Department.create(department);

      console.log(`Created department: ${department.name}`);
    }

    console.log("\nAcademic structure seeding completed successfully.");

    const classCount = await SchoolClass.countDocuments();
    const departmentCount = await Department.countDocuments();

    console.log(`Total classes: ${classCount}`);
    console.log(`Total departments: ${departmentCount}`);
  } catch (error) {
    console.error("\nAcademic structure seeding failed:", error);

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

seedAcademicStructure();
