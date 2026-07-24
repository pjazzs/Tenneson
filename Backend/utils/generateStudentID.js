const Counter = require("../models/Counter");

const generateStudentId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: "studentId" },
    { $inc: { sequenceValue: 1 } },
    {
      new: true,
      upsert: true,
    }
  );

  const sequence = counter.sequenceValue;

  const studentId = `TCC/${String(sequence).padStart(4, "0")}`;

  return studentId;
};

module.exports = generateStudentId;