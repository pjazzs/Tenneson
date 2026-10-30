import { useContext } from "react";
import TeacherAuthContext from "../context/TeacherAuthContext";

export default function useTeacherAuth() {
  return useContext(TeacherAuthContext);
}
