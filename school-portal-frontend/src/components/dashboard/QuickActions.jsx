import {
  FaUserPlus,
  FaUsers,
  FaFileExcel,
  FaUserShield,
  FaClipboardList,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";


function QuickActions() {


  const navigate = useNavigate();

  const { hasPermission } = useAuth();



  const actions = [

    {
      title:"Add Student",
      icon:<FaUserPlus/>,
      color:"green",
      permission:"students.create",
      path:"/students/add"
    },


    {
      title:"Students",
      icon:<FaUsers/>,
      color:"blue",
      permission:"students.view",
      path:"/students"
    },


    {
      title:"Export Students",
      icon:<FaFileExcel/>,
      color:"emerald",
      permission:"students.export",
      path:"/students/export"
    },


    {
      title:"Manage Admins",
      icon:<FaUserShield/>,
      color:"purple",
      permission:"admins.view",
      path:"/admins"
    },


    {
      title:"Audit Logs",
      icon:<FaClipboardList/>,
      color:"orange",
      permission:"logs.view",
      path:"/audit-logs"
    },


  ];




  const colors = {


    green:
    "bg-green-600 hover:bg-green-700",


    blue:
    "bg-blue-600 hover:bg-blue-700",


    emerald:
    "bg-emerald-600 hover:bg-emerald-700",


    purple:
    "bg-purple-600 hover:bg-purple-700",


    orange:
    "bg-orange-600 hover:bg-orange-700",


  };




  return (

    <div
      className="
      bg-slate-900
      border
      border-white/10
      rounded-2xl
      p-6
      shadow-xl
      "
    >


      <h2
        className="
        text-xl
        font-bold
        text-white
        mb-5
        "
      >

        Quick Actions

      </h2>



      <div
        className="
        grid
        grid-cols-2
        md:grid-cols-3
        lg:grid-cols-5
        gap-4
        "
      >


      {
        actions
        .filter(action =>
          hasPermission(action.permission)
        )
        .map(action => (


          <button

            key={action.title}

            onClick={() =>
              navigate(action.path)
            }


            className={`
              ${colors[action.color]}

              rounded-xl

              p-5

              flex

              flex-col

              items-center

              justify-center

              gap-3

              transition

              active:scale-95

              text-white

            `}

          >


            <span
              className="
              text-2xl
              "
            >

              {action.icon}

            </span>


            <span
              className="
              text-sm
              font-semibold
              text-center
              "
            >

              {action.title}

            </span>


          </button>


        ))
      }


      </div>


    </div>

  );

}


export default QuickActions;