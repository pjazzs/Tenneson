import { useContext } from "react";

import StudentAuthContext from "../context/StudentAuthContext";

export default function useStudentAuth() {
  return useContext(StudentAuthContext);
}
