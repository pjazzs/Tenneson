import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function Layout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* =========================================
          SIDEBAR
      ========================================= */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* =========================================
          MAIN AREA
      ========================================= */}
      <div className="flex-1 min-w-0">
        {/* =========================================
            FIXED NAVBAR
        ========================================= */}
        <div
          className="
            fixed
            top-0
            right-0
            left-0
            lg:left-64
            z-50
          "
        >
          <Navbar
            onMenuClick={() =>
              setIsMobileSidebarOpen(true)
            }
          />
        </div>

        {/* =========================================
            PAGE CONTENT
        ========================================= */}
        <main
          className="
            pt-20
            p-4
            md:p-6
          "
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;