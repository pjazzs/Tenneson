const calculateResultGrade = (score) => {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return {
      grade: null,
      remark: "",
    };
  }

  if (score < 0 || score > 100) {
    return {
      grade: null,
      remark: "",
    };
  }

  if (score >= 70) {
    return {
      grade: "D",
      remark: "DISTINCTION",
    };
  }

  if (score >= 60) {
    return {
      grade: "M",
      remark: "MERIT",
    };
  }

  if (score >= 50) {
    return {
      grade: "P",
      remark: "PASS",
    };
  }

  if (score >= 40) {
    return {
      grade: "P",
      remark: "POOR",
    };
  }

  return {
    grade: "F",
    remark: "FAIL",
  };
};

export default calculateResultGrade;
