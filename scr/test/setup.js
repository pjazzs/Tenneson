const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const Student = require("../models/student");

let mongoServer;

jest.setTimeout(120000);

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    binary: {
      version: "7.0.14",
    },
    replSet: {
      count: 1,
    },
  });

  await mongoose.connect(mongoServer.getUri());

  // Ensure the Student model's unique indexes are built
  // before any tests attempt student registration.
  await Student.init();

  console.log("MongoDB Memory Replica Set connected (test)...");
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
});
