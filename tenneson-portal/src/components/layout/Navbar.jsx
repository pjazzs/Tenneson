import {
  FaUserCircle,
  FaSignOutAlt,
  FaBars,
} from "react-icons/fa";

import { logout } from "../../utils/auth";

function Navbar({ onMenuClick }) {
  return (
    <header
      className="
        fixed
        top-0
        left-0
        right-0
        md:left-72
        z-40
        h-[80px]
        bg-slate-950
        border-b
        border-white/10
        px-4
        sm:px-6
        flex
        justify-between
        items-center
        text-white
        shadow-lg
      "
    >
      {/* Left Section */}
      <div className="flex items-center gap-3 min-w-0">

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="
            md:hidden
            flex
            items-center
            justify-center
            bg-white/5
            hover:bg-white/10
            p-2.5
            rounded-xl
            transition
            shrink-0
          "
          aria-label="Open navigation menu"
        >
          <FaBars size={20} />
        </button>

        <div className="min-w-0">

          <h2
            className="
              text-lg
              sm:text-xl
              font-bold
              truncate
            "
          >
            Admin Dashboard
          </h2>

          <p
            className="
              hidden
              sm:block
              text-sm
              text-gray-400
            "
          >
            Manage students and school activities
          </p>

        </div>
      </div>


      {/* Right Section */}
      <div
        className="
          flex
          items-center
          gap-2
          sm:gap-5
          ml-3
        "
      >

        {/* Admin Info */}
        <div
          className="
            hidden
            sm:flex
            items-center
            gap-3
            bg-white/5
            px-4
            py-2
            rounded-xl
          "
        >

          <FaUserCircle
            size={30}
            className="text-green-500"
          />

          <div>

            <p className="text-sm font-semibold">
              Administrator
            </p>

            <p className="text-xs text-gray-400">
              School Portal
            </p>

          </div>

        </div>


        {/* Mobile User Icon */}
        <div
          className="
            flex
            sm:hidden
            items-center
            justify-center
            bg-white/5
            rounded-xl
            p-2
          "
        >

          <FaUserCircle
            size={24}
            className="text-green-500"
          />

        </div>


        {/* Logout */}
        <button
          type="button"
          onClick={logout}
          className="
            flex
            items-center
            justify-center
            gap-2
            bg-red-600
            hover:bg-red-700
            px-3
            sm:px-4
            py-2
            rounded-xl
            transition
            shadow-lg
            text-sm
            sm:text-base
            whitespace-nowrap
          "
        >

          <FaSignOutAlt />

          <span className="hidden sm:inline">
            Logout
          </span>

        </button>

      </div>

    </header>
  );
}

export default Navbar;