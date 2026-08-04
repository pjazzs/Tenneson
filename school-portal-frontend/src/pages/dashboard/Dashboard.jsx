import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  FaUsers,
  FaUserCheck,
  FaArchive,
  FaMale,
  FaFemale,
} from "react-icons/fa";

function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get("/students/dashboard");
        setStats(response.data.data);
      } catch (error) {
        console.log(
          "Dashboard error:",
          error.response?.data || error.message
        );
      }
    };

    fetchDashboard();
  }, []);

  if (!stats) {
    return (
      <div className="flex justify-center items-center h-60">
        <div className="text-lg font-semibold text-blue-600 animate-pulse">
          Loading dashboard...
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: <FaUsers size={28} />,
      bg: "bg-blue-600",
    },
    {
      title: "Active Students",
      value: stats.activeStudents,
      icon: <FaUserCheck size={28} />,
      bg: "bg-green-600",
    },
    {
      title: "Archived Students",
      value: stats.inactiveStudents,
      icon: <FaArchive size={28} />,
      bg: "bg-red-600",
    },
    {
      title: "Male Students",
      value: stats.maleStudents,
      icon: <FaMale size={28} />,
      bg: "bg-indigo-600",
    },
    {
      title: "Female Students",
      value: stats.femaleStudents,
      icon: <FaFemale size={28} />,
      bg: "bg-pink-600",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800">
        Dashboard Overview
      </h1>

      <p className="text-gray-500 mt-2">
        Monitor your school activities here.
      </p>

      {/* Statistics Cards */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mt-8">
        {cards.map((card) => (
          <div
            key={card.title}
            className={`${card.bg} rounded-xl shadow-lg p-6 text-white transition hover:scale-105`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm opacity-90">
                  {card.title}
                </h3>

                <p className="text-3xl font-bold mt-2">
                  {card.value}
                </p>
              </div>

              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Students */}

      <div className="bg-white rounded-xl shadow mt-8 p-6">
        <h2 className="text-xl font-bold mb-4">
          Recent Students
        </h2>

        {stats.recentStudents.length === 0 ? (
          <p className="text-gray-500">
            No students found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="text-left p-3">Student ID</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Class</th>
                </tr>
              </thead>

              <tbody>
                {stats.recentStudents.map((student) => (
                  <tr
                    key={student.studentId}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-3">
                      {student.studentId}
                    </td>

                    <td className="p-3">
                      {student.firstName} {student.lastName}
                    </td>

                    <td className="p-3">
                      {student.currentClass}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;