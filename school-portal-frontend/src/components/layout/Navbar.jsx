import {
  FaUserCircle,
  FaSignOutAlt,
} from "react-icons/fa";

import { logout } from "../../utils/auth";


function Navbar() {


  return (

    <header
      className="
        bg-slate-950
        border-b
        border-white/10
        px-6
        py-4
        flex
        justify-between
        items-center
        text-white
      "
    >


      {/* Left Section */}

      <div>


        <h2
          className="
            text-xl
            font-bold
          "
        >

          Admin Dashboard

        </h2>


        <p
          className="
            text-sm
            text-gray-400
          "
        >

          Manage students and school activities

        </p>


      </div>






      {/* Right Section */}


      <div
        className="
          flex
          items-center
          gap-5
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


            <p
              className="
                text-sm
                font-semibold
              "
            >

              Administrator

            </p>


            <p
              className="
                text-xs
                text-gray-400
              "
            >

              School Portal

            </p>


          </div>


        </div>








        {/* Logout Button */}


        <button

          onClick={logout}

          className="
            flex
            items-center
            gap-2
            bg-red-600
            hover:bg-red-700
            px-4
            py-2
            rounded-xl
            transition
            shadow-lg
          "

        >

          <FaSignOutAlt />

          Logout


        </button>



      </div>



    </header>


  );

}


export default Navbar;