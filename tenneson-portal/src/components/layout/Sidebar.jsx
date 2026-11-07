import { useState } from "react";
import useAuth from "../../hooks/useAuth";

import {
  FaHome,
  FaUserGraduate,
  FaArchive,
  FaHistory,
  FaSchool,
  FaTimes,
  FaUserShield,
  FaClipboardList,
  FaExchangeAlt,
  FaFileAlt,
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaBook,
  FaClipboardCheck,
  FaChevronDown,
} from "react-icons/fa";

import { NavLink, useLocation } from "react-router-dom";

function Sidebar({ isMobileOpen, onClose }) {
  const { admin, hasPermission } = useAuth();
  const location = useLocation();

  const isAdmin = admin?.role === "admin" || admin?.role === "super_admin";

  const navigationGroups = [
    {
      name: "Students",
      icon: <FaUserGraduate />,
      visible: hasPermission("students.view"),
      items: [
        {
          name: "Student Records",
          path: "/students",
          icon: <FaUserGraduate />,
          visible: hasPermission("students.view"),
          end: true,
        },
        {
          name: "Archived Students",
          path: "/students/archived",
          icon: <FaArchive />,
          visible: hasPermission("students.view"),
          end: true,
        },
        {
          name: "Promotions",
          path: "/promotions",
          icon: <FaExchangeAlt />,
          visible: isAdmin,
          end: true,
        },
      ],
    },

    {
      name: "Teachers",
      icon: <FaChalkboardTeacher />,
      visible:
        hasPermission("teachers.view") ||
        hasPermission("class-subject-allocations.view") ||
        hasPermission("teacher-assignments.view"),
      items: [
        {
          name: "Teacher Management",
          path: "/teachers",
          icon: <FaChalkboardTeacher />,
          visible: hasPermission("teachers.view"),
          end: true,
        },
        {
          name: "Subject Allocation",
          path: "/subject-allocations",
          icon: <FaBook />,
          visible: hasPermission("class-subject-allocations.view"),
          end: true,
        },
        {
          name: "Teacher Assignments",
          path: "/teacher-assignments",
          icon: <FaChalkboardTeacher />,
          visible: hasPermission("teacher-assignments.view"),
          end: true,
        },
      ],
    },

    {
      name: "Results",
      icon: <FaFileAlt />,
      visible:
        hasPermission("results.view") ||
        hasPermission("results.create") ||
        hasPermission("results.update") ||
        hasPermission("results.submit") ||
        hasPermission("results.approve") ||
        hasPermission("results.publish"),
      items: [
        {
          name: "Results",
          path: "/results",
          icon: <FaFileAlt />,
          visible: hasPermission("results.view"),
          end: true,
        },
        {
          name: "Result Entry",
          path: "/results/entry",
          icon: <FaClipboardList />,
          visible: hasPermission("results.create"),
          end: true,
        },
        {
          name: "Subject Result Review",
          path: "/subject-result-review",
          icon: <FaClipboardCheck />,
          visible: hasPermission("results.view"),
          end: true,
        },
        {
          name: "Subject Correction Requests",
          path: "/subject-result-correction-requests",
          icon: <FaClipboardCheck />,
          visible: hasPermission("results.view"),
          end: true,
        },
      ],
    },

    {
      name: "Administration",
      icon: <FaSchool />,
      visible:
        hasPermission("academic-sessions.view") ||
        hasPermission("students.view") ||
        hasPermission("admins.manage") ||
        isAdmin,
      items: [
        {
          name: "Academic Sessions",
          path: "/academic-sessions",
          icon: <FaCalendarAlt />,
          visible: hasPermission("academic-sessions.view"),
          end: true,
        },
        {
          name: "Activity Logs",
          path: "/activity-logs",
          icon: <FaHistory />,
          visible: hasPermission("students.view"),
          end: true,
        },
        {
          name: "Audit Logs",
          path: "/audit-logs",
          icon: <FaClipboardList />,
          visible: isAdmin,
          end: true,
        },
        {
          name: "Admin Management",
          path: "/admins",
          icon: <FaUserShield />,
          visible: hasPermission("admins.manage"),
          end: true,
        },
      ],
    },
  ];

  // Find the group containing the currently active route.
  const activeGroup = navigationGroups.find((group) =>
    group.items.some(
      (item) =>
        item.visible &&
        (item.end
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path)),
    ),
  )?.name;

  const [expandedGroup, setExpandedGroup] = useState(null);

  const isGroupExpanded = (groupName) =>
    expandedGroup === null
      ? activeGroup === groupName
      : expandedGroup === groupName;

  // Automatically expand the group when navigating to one of its pages.

  const toggleGroup = (groupName) => {
    setExpandedGroup((current) => {
      const currentlyExpanded =
        current === null ? activeGroup === groupName : current === groupName;

      return currentlyExpanded ? "__none__" : groupName;
    });
  };

  const linkClass = ({ isActive }) =>
    `
      flex items-center gap-3
      px-4 py-3
      rounded-xl
      transition-all duration-200
      ${
        isActive
          ? "bg-green-600 text-white shadow-lg"
          : "text-gray-300 hover:bg-white/10 hover:text-white"
      }
    `;

  return (
    <>
      {/* MOBILE OVERLAY */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed md:sticky
          inset-y-0 left-0
          z-50
          w-72
          h-dvh
          max-h-dvh
          bg-slate-950
          text-white
          flex flex-col
          overflow-hidden
          p-5
          border-r border-white/10
          transform transition-transform duration-300 ease-in-out
          ${
            isMobileOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        {/* LOGO */}
        <div className="relative flex items-center gap-3 mb-6 shrink-0">
          <div className="bg-green-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <FaSchool size={24} />
          </div>

          <div>
            <h1 className="text-xl font-bold">Tenneson</h1>
            <p className="text-xs text-gray-400">School Portal</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="md:hidden absolute right-0 text-gray-400 hover:text-white transition"
            aria-label="Close navigation menu"
          >
            <FaTimes size={22} />
          </button>
        </div>

        {/* DASHBOARD */}
        <div className="shrink-0 mb-3">
          <NavLink to="/dashboard" end onClick={onClose} className={linkClass}>
            <FaHome className="text-lg shrink-0" />
            <span className="font-medium">Dashboard</span>
          </NavLink>
        </div>

        {/* SCROLLABLE NAVIGATION */}
        <nav
          className="
            flex-1
            min-h-0
            overflow-y-auto
            overscroll-contain
            space-y-2
            pr-1
            pb-4
            [scrollbar-thin]
            [scrollbar-color:#475569_transparent]
          "
          aria-label="Main navigation"
        >
          {navigationGroups
            .filter((group) => group.visible)
            .map((group) => {
              const visibleItems = group.items.filter((item) => item.visible);

              const isExpanded = isGroupExpanded(group.name);

              const containsActivePage = visibleItems.some(
                (item) => location.pathname === item.path,
              );

              return (
                <div key={group.name}>
                  {/* GROUP HEADER */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.name)}
                    aria-expanded={isExpanded}
                    className={`
                      w-full
                      flex items-center justify-between
                      gap-3
                      px-4 py-3
                      rounded-xl
                      transition-all duration-200
                      ${
                        containsActivePage
                          ? "text-green-400 bg-white/5"
                          : "text-gray-300 hover:bg-white/10 hover:text-white"
                      }
                    `}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">{group.icon}</span>

                      <span className="font-semibold truncate">
                        {group.name}
                      </span>
                    </span>

                    <FaChevronDown
                      className={`
                        text-xs shrink-0
                        transition-transform duration-200
                        ${isExpanded ? "rotate-180" : ""}
                      `}
                    />
                  </button>

                  {/* GROUP CHILDREN */}
                  {isExpanded && (
                    <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-1">
                      {visibleItems.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.end}
                          onClick={onClose}
                          className={linkClass}
                        >
                          <span className="text-base shrink-0">
                            {item.icon}
                          </span>

                          <span className="text-sm font-medium">
                            {item.name}
                          </span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>

        {/* FOOTER */}
        <div className="shrink-0 pt-3 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-sm text-gray-300">
              Tenneson Comprehensive College
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Student Management System
            </p>
          </div>

          <p className="text-xs italic text-gray-400 text-center mt-4 tracking-wide">
            Designed by{" "}
            <span className="font-semibold text-gray-500">Pjazz</span>
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
