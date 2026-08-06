import { useEffect, useState } from "react";
import api from "../../api/axios";

import {
  FaUserShield,
  FaTimes,
} from "react-icons/fa";


function AdminManagement() {


  const [admins, setAdmins] = useState([]);

  const [loading, setLoading] = useState(true);

  const [selectedAdmin, setSelectedAdmin] = useState(null);

  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const [permissions, setPermissions] = useState([]);



  const availablePermissions = [

    "students.view",
    "students.create",
    "students.update",
    "students.delete",
    "students.export",

    "admins.view",
    "admins.create",
    "admins.update",
    "admins.delete",

  ];



  useEffect(() => {


    const fetchAdmins = async () => {


      try {


        const response = await api.get(
          "/admins"
        );


        setAdmins(
          response.data.admins
        );


      } catch(error) {


        console.log(
          "Admin fetch error:",
          error.response?.data || error.message
        );


      } finally {


        setLoading(false);


      }


    };


    fetchAdmins();


  }, []);




  const openPermissionModal = (admin) => {


    setSelectedAdmin(admin);


    setPermissions(
      admin.permissions || []
    );


    setShowPermissionModal(true);


  };




  const togglePermission = (permission) => {


    setPermissions(prev =>


      prev.includes(permission)

      ? prev.filter(item => item !== permission)

      : [...prev, permission]


    );


  };


  const savePermissions = async () => {

  try {

    await api.patch(
      `/admins/${selectedAdmin._id}/permissions`,
      {
        permissions,
      }
    );


    // update table immediately
    setAdmins(prev =>
      prev.map(admin =>
        admin._id === selectedAdmin._id
          ? {
              ...admin,
              permissions,
            }
          : admin
      )
    );


    setShowPermissionModal(false);


  } catch(error) {

    console.log(
      "Permission update error:",
      error.response?.data || error.message
    );

  }

};





  if(loading){


    return (

      <div className="
        flex
        justify-center
        items-center
        h-60
        text-white
      ">

        Loading admins...

      </div>

    );


  }





  return (

    <div className="
      min-h-screen
      bg-slate-950
      p-6
      text-white
    ">


      <div className="mb-8">


        <h1 className="
          text-3xl
          font-bold
          flex
          items-center
          gap-3
        ">

          <FaUserShield/>

          Admin Management

        </h1>



        <p className="
          text-gray-400
          mt-2
        ">

          Manage administrators and their permissions.

        </p>


      </div>





      <div className="
        bg-white/10
        border
        border-white/10
        rounded-2xl
        overflow-hidden
      ">


        <div className="
          overflow-x-auto
        ">


          <table className="
            w-full
          ">


            <thead>


              <tr className="
                border-b
                border-white/10
                text-gray-300
              ">


                <th className="p-4 text-left">
                  Name
                </th>


                <th className="p-4 text-left">
                  Email
                </th>


                <th className="p-4 text-left">
                  Role
                </th>


                <th className="p-4 text-left">
                  Permissions
                </th>


                <th className="p-4 text-left">
                  Action
                </th>


              </tr>


            </thead>



            <tbody>


            {
              admins.map(admin => (


                <tr

                  key={admin._id}

                  className="
                    border-b
                    border-white/10
                    hover:bg-white/5
                  "

                >


                  <td className="p-4">

                    {admin.fullName}

                  </td>



                  <td className="p-4">

                    {admin.email}

                  </td>



                  <td className="p-4">

                    <span className="
                      px-3
                      py-1
                      rounded-full
                      bg-green-600/20
                      text-green-400
                      text-sm
                    ">

                      {admin.role}

                    </span>


                  </td>



                  <td className="p-4">


                    <span className="
                      bg-blue-600/20
                      text-blue-400
                      px-3
                      py-1
                      rounded-full
                      text-sm
                    ">


                      {admin.permissions?.length || 0}

                      {" "}

                      permissions


                    </span>


                  </td>



                  <td className="p-4">


                    <button

                      onClick={() =>
                        openPermissionModal(admin)
                      }

                      disabled={
                        admin.role === "super_admin"
                      }

                      className="
                        flex
                        items-center
                        gap-2
                        bg-purple-600
                        hover:bg-purple-700
                        disabled:bg-gray-600
                        disabled:cursor-not-allowed
                        px-4
                        py-2
                        rounded-xl
                      "

                    >

                      <FaUserShield/>

                      Manage


                    </button>


                  </td>



                </tr>


              ))
            }


            </tbody>


          </table>


        </div>


      </div>






      {
        showPermissionModal && (

          <div className="
            fixed
            inset-0
            bg-black/60
            flex
            items-center
            justify-center
            z-50
          ">


            <div className="
              bg-slate-900
              border
              border-white/10
              rounded-2xl
              p-6
              w-full
              max-w-lg
            ">


              <div className="
                flex
                justify-between
                items-center
                mb-6
              ">


                <div>

                  <h2 className="
                    text-xl
                    font-bold
                  ">

                    Manage Permissions

                  </h2>


                  <p className="
                    text-gray-400
                    text-sm
                  ">

                    {selectedAdmin?.fullName}

                  </p>


                </div>



                <button

                  onClick={() =>
                    setShowPermissionModal(false)
                  }

                >

                  <FaTimes/>

                </button>


              </div>




              <div className="
                space-y-3
                max-h-80
                overflow-y-auto
              ">


              {
                availablePermissions.map(permission => (


                  <label

                    key={permission}

                    className="
                      flex
                      items-center
                      gap-3
                      bg-white/5
                      p-3
                      rounded-lg
                      cursor-pointer
                    "

                  >


                    <input

                      type="checkbox"

                      checked={
                        permissions.includes(permission)
                      }

                      onChange={() =>
                        togglePermission(permission)
                      }

                    />


                    {permission}


                  </label>


                ))
              }


              </div>




              <button
              onClick={savePermissions}

                className="
                  mt-6
                  w-full
                  bg-green-600
                  hover:bg-green-700
                  py-3
                  rounded-xl
                  font-semibold
                "

              >

                Save Permissions

              </button>



            </div>


          </div>

        )
      }




    </div>

  );


}


export default AdminManagement;