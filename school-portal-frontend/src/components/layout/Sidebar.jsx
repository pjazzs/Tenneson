import {
  FaHome,
  FaUserGraduate,
  FaArchive,
} from "react-icons/fa";

import { Link } from "react-router-dom";


function Sidebar() {

  return (
    <aside
      className="
        hidden md:flex
        w-64
        bg-blue-700
        text-white
        min-h-screen
        flex-col
        p-5
      "
    >

      <h1 className="text-2xl font-bold mb-8">
        School Portal
      </h1>


      <nav className="space-y-4">


        <Link
          to="/dashboard"
          className="
            flex
            items-center
            gap-3
            hover:bg-blue-600
            p-3
            rounded
          "
        >
          <FaHome />
          Dashboard
        </Link>



        <Link
          to="/students"
          className="
            flex
            items-center
            gap-3
            hover:bg-blue-600
            p-3
            rounded
          "
        >
          <FaUserGraduate />
          Students
        </Link>



        <Link
          to="/students/archived"
          className="
            flex
            items-center
            gap-3
            hover:bg-blue-600
            p-3
            rounded
          "
        >
          <FaArchive />
          Archived Students
        </Link>


      </nav>


    </aside>
  );

}


export default Sidebar;