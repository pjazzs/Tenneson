
import {
  FaHome,
  FaUserGraduate,
  FaArchive,
  FaHistory,
  FaSchool,
  FaTimes,
} from "react-icons/fa";

import { NavLink } from "react-router-dom";

function Sidebar({ isMobileOpen, onClose }) {
  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <FaHome />,
    },

    {
      name: "Students",
      path: "/students",
      icon: <FaUserGraduate />,
    },

    {
      name: "Activity Logs",
      path: "/activity-logs",
      icon: <FaHistory />,
    },

    {
      name: "Archived Students",
      path: "/students/archived",
      icon: <FaArchive />,
    },
  ];

  return (
    <>
      {/* =========================================
          MOBILE OVERLAY
      ========================================= */}

      {isMobileOpen && (
        <div
          className="
            md:hidden
            fixed
            inset-0
            z-40
            bg-black/50
          "
          onClick={onClose}
        />
      )}

      {/* =========================================
          SIDEBAR
      ========================================= */}

      <aside
        className={`
          fixed
          md:static
          inset-y-0
          left-0
          z-50
          w-72
          min-h-screen
          bg-slate-950
          text-white
          flex
          flex-col
          p-6
          border-r
          border-white/10

          transform
          transition-transform
          duration-300
          ease-in-out

          ${
            isMobileOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        {/* =========================================
            MOBILE CLOSE BUTTON
        ========================================= */}

        <button
          type="button"
          onClick={onClose}
          className="
            md:hidden
            absolute
            top-5
            right-5
            text-gray-400
            hover:text-white
            transition
          "
          aria-label="Close navigation menu"
        >
          <FaTimes size={22} />
        </button>

        {/* =========================================
            LOGO SECTION
        ========================================= */}

        <div
          className="
            flex
            items-center
            gap-3
            mb-10
          "
        >
          <div
            className="
              bg-green-600
              w-12
              h-12
              rounded-xl
              flex
              items-center
              justify-center
              shadow-lg
              flex-shrink-0
            "
          >
            <FaSchool size={24} />
          </div>

          <div>
            <h1 className="text-xl font-bold">
              Tenneson
            </h1>

            <p className="text-xs text-gray-400">
              School Portal
            </p>
          </div>
        </div>

        {/* =========================================
            NAVIGATION
        ========================================= */}

        <nav className="space-y-3 flex-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `
                flex
                items-center
                gap-4
                px-4
                py-3
                rounded-xl
                transition-all
                duration-300

                ${
                  isActive
                    ? "bg-green-600 text-white shadow-lg"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <span className="text-lg">
                {item.icon}
              </span>

              <span className="font-medium">
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* =========================================
            FOOTER
        ========================================= */}

        <div
          className="
            mt-auto
            bg-white/5
            border
            border-white/10
            rounded-xl
            p-4
          "
        >
          <p className="text-sm text-gray-300">
            Tenneson Comprehensive College
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Student Management System
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
