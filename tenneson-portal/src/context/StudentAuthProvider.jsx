import { useCallback, useMemo, useState } from "react";

import StudentAuthContext from "./StudentAuthContext";

export function StudentAuthProvider({ children }) {
  // Restore the student profile from localStorage.
  const [student, setStudent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("student")) || null;
    } catch {
      return null;
    }
  });

  // Restore the student authentication token.
  const [studentToken, setStudentToken] = useState(
    () => localStorage.getItem("studentToken") || null,
  );

  // Log in a student and persist the session.
  const loginStudent = useCallback(({ token, student: studentData }) => {
    if (!token || !studentData) {
      throw new Error("A valid student token and profile are required.");
    }

    localStorage.setItem("studentToken", token);
    localStorage.setItem("student", JSON.stringify(studentData));

    setStudentToken(token);
    setStudent(studentData);
  }, []);

  // Update the stored student profile.
  const updateStudent = useCallback((studentData) => {
    if (!studentData) return;

    localStorage.setItem("student", JSON.stringify(studentData));

    setStudent(studentData);
  }, []);

  // Log out and clear the student session.
  const logoutStudent = useCallback(() => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("student");

    sessionStorage.removeItem("studentPasswordChangeToken");

    setStudentToken(null);
    setStudent(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      student,
      studentToken,
      loginStudent,
      updateStudent,
      logoutStudent,
    }),
    [student, studentToken, loginStudent, updateStudent, logoutStudent],
  );

  return (
    <StudentAuthContext.Provider value={contextValue}>
      {children}
    </StudentAuthContext.Provider>
  );
}
