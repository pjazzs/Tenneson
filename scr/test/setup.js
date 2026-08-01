const mongoose = require("mongoose");
const connectDB = require("../Confiq/Db");

jest.setTimeout(30000);

beforeAll(async () => {
  require("dotenv").config();
  await connectDB();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

// const mongoose = require("mongoose");
// const { MongoMemoryServer } = require("mongodb-memory-server");

// let mongoServer;

// jest.setTimeout(60000);

// beforeAll(async () => {
//   mongoServer = await MongoMemoryServer.create({
//     binary: {
//       version: "7.0.14",
//     },
//   });

//   await mongoose.connect(mongoServer.getUri());
// });

// afterEach(async () => {
//   if (mongoose.connection.readyState !== 1) {
//     return;
//   }

//   const collections = mongoose.connection.collections;

//   for (const key in collections) {
//     await collections[key].deleteMany({});
//   }
// });

// afterAll(async () => {
//   if (mongoose.connection.readyState === 1) {
//     await mongoose.connection.close();
//   }

//   if (mongoServer) {
//     await mongoServer.stop();
//   }
// });
