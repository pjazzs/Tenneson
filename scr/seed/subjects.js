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
    name: "Government",
    code: "GOVT",
  },
  {
    name: "Literature-in-English",
    code: "LIT",
  },
  {
    name: "Physics",
    code: "PHY",
  },
  {
    name: "Chemistry",
    code: "CHM",
  },
  {
    name: "Food and Nutrition",
    code: "FN",
  },
  {
    name: "Biology",
    code: "BIO",
  },
  {
    name: "Citizenship",
    code: "CIT",
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
    name: "Digital Technology",
    code: "DTECH",
  },
  {
    name: "Civic Education",
    code: "CIVIC",
  },
  {
    name: "Agricultural Science",
    code: "AGRIC",
  },
  {
    name: "Cultural And Creative Arts",
    code: "C.C.A",
  },
  {
    name: "Christian Religious Studies",
    code: "CRS",
  },
  {
    name: "Physical and Health Education",
    code: "PHE",
  },
  {
    name: "Music",
    code: "Music",
  },
  {
    name: "Yoruba",
    code: "YOR",
  },
  {
    name: "Business Studies",
    code: "BUS",
  },
  {
    name: "History",
    code: "HIS",
  },
  {
    name: "Home Economics",
    code: "H/ECONS",
  },
  {
    name: "French",
    code: "FR",
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
