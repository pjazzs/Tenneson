import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiUser,
  FiCalendar,
  FiBookOpen,
  FiPhone,
  FiShield,
} from "react-icons/fi";

import useStudentAuth from "../../hooks/useStudentAuth";
import studentApi from "../../api/studentApi";

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
        <Icon size={18} />
      </div>

      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
    </div>

    <p className="text-slate-100 font-medium wrap-break-words">
      {value || "Not provided"}
    </p>
  </div>
);

function StudentProfile() {
  const navigate = useNavigate();

  const { student: storedStudent } = useStudentAuth();

  const [student, setStudent] = useState(storedStudent);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await studentApi.get("/student/me");

        if (response.data?.student) {
          setStudent(response.data.student);
        }
      } catch (error) {
        console.error(
          "Failed to load student profile:",
          error?.response?.data?.message || error.message,
        );
      }
    };

    loadProfile();
  }, []);

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-300 mb-4">
            Student information could not be loaded.
          </p>

          <button
            onClick={() => navigate("/student/login", { replace: true })}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const fullName = [student.firstName, student.otherName, student.lastName]
    .filter(Boolean)
    .join(" ");

  const photoUrl =
    typeof student.photo === "string"
      ? student.photo
      : student.photo?.url || "";

  const formatDate = (date) => {
    if (!date) return "Not provided";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Not provided";
    }

    return parsed.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => navigate("/student/dashboard")}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition"
          >
            <FiArrowLeft />
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="h-32 bg-linear-to-r from-blue-900/50 via-slate-900 to-slate-900" />

          <div className="px-6 sm:px-8 pb-8">
            <div className="-mt-16 flex flex-col sm:flex-row sm:items-end gap-5">
              <div className="w-32 h-32 rounded-3xl border-4 border-slate-900 bg-slate-800 overflow-hidden flex items-center justify-center">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FiUser size={48} className="text-slate-500" />
                )}
              </div>

              <div className="pb-1">
                <h1 className="text-2xl sm:text-3xl font-bold">{fullName}</h1>

                <p className="text-blue-400 mt-1">{student.studentId}</p>
              </div>
            </div>

            <div className="mt-8">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Student Account
              </span>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <FiUser className="text-blue-400" />
            <h2 className="text-xl font-semibold">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem
              icon={FiUser}
              label="Student ID"
              value={student.studentId}
            />

            <InfoItem icon={FiUser} label="Gender" value={student.gender} />

            <InfoItem
              icon={FiCalendar}
              label="Date of Birth"
              value={formatDate(student.dateOfBirth || student.DOB)}
            />

            <InfoItem
              icon={FiBookOpen}
              label="Current Class"
              value={student.currentClass}
            />

            <InfoItem
              icon={FiCalendar}
              label="Academic Session"
              value={student.session}
            />

            <InfoItem
              icon={FiShield}
              label="Account Status"
              value={student.isActive === false ? "Inactive" : "Active"}
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <FiPhone className="text-blue-400" />

            <h2 className="text-xl font-semibold">
              Parent / Guardian Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem
              icon={FiUser}
              label="Parent / Guardian Name"
              value={student.parentName}
            />

            <InfoItem
              icon={FiPhone}
              label="Parent / Guardian Phone"
              value={student.parentPhone}
            />
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
          <p className="text-sm text-slate-300 leading-6">
            Your profile information is managed by the school administration. If
            any information is incorrect, please contact the school
            administration.
          </p>
        </div>
      </main>
    </div>
  );
}

export default StudentProfile;
