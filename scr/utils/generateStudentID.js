const Counter = require("../models/Counter");

const generateStudentId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: "studentId" },
    { $inc: { sequenceValue: 1 } },
    {
      returnDocument: "after",
      upsert: true,
    },
  );

  const sequence = counter.sequenceValue;

  const studentId = `TCC${String(sequence).padStart(5, "0")}`;

  return studentId;
};

module.exports = generateStudentId;
