import { createContext, useCallback, useState } from "react";

const StudentAuthContext = createContext();

export function StudentAuthProvider({ children }) {
  const [student, setStudent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("student")) || null;
    } catch {
      return null;
    }
  });

  const [studentToken, setStudentToken] = useState(
    () => localStorage.getItem("studentToken") || null,
  );

  const loginStudent = useCallback(({ token, student: studentData }) => {
    localStorage.setItem("studentToken", token);
    localStorage.setItem("student", JSON.stringify(studentData));

    setStudentToken(token);
    setStudent(studentData);
  }, []);

  const logoutStudent = useCallback(() => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("student");

    setStudentToken(null);
    setStudent(null);
  }, []);

  return (
    <StudentAuthContext.Provider
      value={{
        student,
        studentToken,
        loginStudent,
        logoutStudent,
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  );
}

export default StudentAuthContext;
