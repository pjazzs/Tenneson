import { createContext, useCallback, useState } from "react";

const TeacherAuthContext = createContext();

export function TeacherAuthProvider({ children }) {
  const [teacher, setTeacher] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("teacher")) || null;
    } catch {
      return null;
    }
  });

  const [teacherToken, setTeacherToken] = useState(
    () => localStorage.getItem("teacherToken") || null,
  );

  const loginTeacher = useCallback(({ token, teacher: teacherData }) => {
    localStorage.setItem("teacherToken", token);
    localStorage.setItem("teacher", JSON.stringify(teacherData));

    setTeacherToken(token);
    setTeacher(teacherData);
  }, []);

  const updateTeacher = useCallback((teacherData) => {
    if (!teacherData) return;

    localStorage.setItem("teacher", JSON.stringify(teacherData));
    setTeacher(teacherData);
  }, []);

  const logoutTeacher = useCallback(() => {
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacher");

    sessionStorage.removeItem("teacherPasswordChangeToken");

    setTeacherToken(null);
    setTeacher(null);
  }, []);

  return (
    <TeacherAuthContext.Provider
      value={{
        teacher,
        teacherToken,
        loginTeacher,
        updateTeacher,
        logoutTeacher,
      }}
    >
      {children}
    </TeacherAuthContext.Provider>
  );
}

export default TeacherAuthContext;
