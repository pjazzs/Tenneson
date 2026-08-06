import {
  FaHome,
  FaUserGraduate,
  FaArchive,
  FaHistory,
  FaSchool,
} from "react-icons/fa";

import { NavLink } from "react-router-dom";


function Sidebar() {


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

    <aside
      className="
        hidden
        md:flex
        w-72
        min-h-screen
        bg-slate-950
        text-white
        flex-col
        p-6
        border-r
        border-white/10
      "
    >



      {/* Logo Section */}


      <div className="
        flex
        items-center
        gap-3
        mb-10
      ">


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
          "
        >

          <FaSchool size={24}/>


        </div>



        <div>


          <h1 className="
            text-xl
            font-bold
          ">

            Tenneson

          </h1>


          <p className="
            text-xs
            text-gray-400
          ">

            School Portal

          </p>


        </div>


      </div>







      {/* Navigation */}



      <nav className="
        space-y-3
        flex-1
      ">


        {
          menuItems.map((item)=>(


            <NavLink

              key={item.path}

              to={item.path}


              className={({isActive}) => `

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

                  ?

                  "bg-green-600 text-white shadow-lg"

                  :

                  "text-gray-300 hover:bg-white/10 hover:text-white"

                }

              `}

            >



              <span
                className="
                  text-lg
                "
              >

                {item.icon}

              </span>




              <span className="
                font-medium
              ">

                {item.name}

              </span>



            </NavLink>


          ))
        }



      </nav>








      {/* Footer */}



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


        <p className="
          text-sm
          text-gray-300
        ">

          Tenneson Comprehensive College

        </p>


        <p className="
          text-xs
          text-gray-500
          mt-1
        ">

          Student Management System

        </p>


      </div>




    </aside>


  );

}



export default Sidebar;