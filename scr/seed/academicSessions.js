require("dotenv").config();

const mongoose = require("mongoose");
const AcademicSession = require("../models/AcademicSession");

const MONGO_URI = process.env.MONGO_URI;

const seedAcademicSession = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("Connected to MongoDB.");

    const existingSession = await AcademicSession.findOne({
      name: "2025/2026",
    });

    if (existingSession) {
      console.log("Academic session already exists.");
      return;
    }

    const academicSession = await AcademicSession.create({
      name: "2025/2026",

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

      isActive: true,
    });

    console.log(`Created: ${academicSession.name}`);
    console.log("Academic session seeding completed.");
  } catch (error) {
    console.error("Academic session seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedAcademicSession();
