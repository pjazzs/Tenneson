import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function Layout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">

        {/* Fixed Navbar */}
        <div className="fixed top-0 right-0 left-0 md:left-72 z-40">
          <Navbar
            onMenuClick={() =>
              setIsMobileSidebarOpen(true)
            }
          />
        </div>

        {/* Page Content */}
        <main className="pt-24 p-4 md:p-6 md:pt-24">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default Layout;