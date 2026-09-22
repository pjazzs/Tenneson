require("dotenv").config();
const mongoose = require("mongoose");
const Subject = require("../models/Subject");

const subjects = [
  {
    name: "Mathematics",
    code: "MATH",
  },
  {
    name: "English Language",
    code: "ENG",
  },
  {
    name: "Basic Science",
    code: "BSC",
  },
  {
    name: "Basic Technology",
    code: "BTECH",
  },
  {
    name: "Social Studies",
    code: "SOS",
  },
  {
    name: "Computer Studies",
    code: "COM",
  },
  {
    name: "Civic Education",
    code: "CIVIC",
  },
  {
    name: "Agricultural Science",
    code: "AGRIC",
  },
];

const seedSubjects = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB.");

    for (const subject of subjects) {
      const existingSubject = await Subject.findOne({
        $or: [{ name: subject.name }, { code: subject.code }],
      });

      if (existingSubject) {
        console.log(`Skipped: ${subject.name}`);
        continue;
      }

      await Subject.create(subject);

      console.log(`Created: ${subject.name}`);
    }

    console.log("Subject seeding completed.");
    process.exit(0);
  } catch (error) {
    console.error("Subject seeding failed:", error);
    process.exit(1);
  }
};

seedSubjects();
