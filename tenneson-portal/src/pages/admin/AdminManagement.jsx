import { useEffect, useState } from "react";
import api from "../../api/axios";

import {
  FaUserShield,
  FaTimes,
  FaPlus,
  FaArrowLeft,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";


function AdminManagement() {


  const navigate = useNavigate();


  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showPermissionModal, setShowPermissionModal] = useState(false);


  const [admins, setAdmins] = useState([]);

  const [loading, setLoading] = useState(true);


  const [selectedAdmin, setSelectedAdmin] = useState(null);


  const [permissions, setPermissions] = useState([]);



  const [newAdmin, setNewAdmin] = useState({

    fullName: "",

    email: "",

    password: "",

    role: "admin",

  });



  const permissionGroups = {


    Students: [

      {
        key: "students.view",
        label: "View Students",
      },

      {
        key: "students.create",
        label: "Create Student",
      },

      {
        key: "students.update",
        label: "Update Student",
      },

      {
        key: "students.delete",
        label: "Delete Student",
      },

      {
        key: "students.export",
        label: "Export Students",
      },

      {
        key: "students.photo",
        label: "Upload Student Photo",
      },

        {
        key: "students.import",
        label: "Import Students",
      },

    ],



    Admins: [

      {
        key: "admins.view",
        label: "View Admins",
      },

      {
        key: "admins.create",
        label: "Create Admin",
      },

      {
        key: "admins.update",
        label: "Update Admin",
      },

      {
        key: "admins.delete",
        label: "Delete Admin",
      },
     

    ],


  };



  const allPermissions = Object.values(permissionGroups)

    .flat()

    .map(permission => permission.key);




  useEffect(() => {


    const fetchAdmins = async () => {


      try {


        const response = await api.get("/admins");


        setAdmins(response.data.admins || []);



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




  const createAdmin = async () => {


    try {


      const response = await api.post(
        "/auth/register",
        newAdmin
      );



      setAdmins(prev => [

        ...prev,

        response.data.admin

      ]);



      setShowCreateModal(false);



      setNewAdmin({

        fullName: "",

        email: "",

        password: "",

        role: "admin",

      });



    } catch(error) {


      console.log(

        "Create admin error:",

        error.response?.data || error.message

      );


    }


  };



 const deleteAdmin = async (adminId) => {

  const confirmDelete = window.confirm(
    "Are you sure you want to delete this admin?"
  );


  if (!confirmDelete) return;


  try {

    await api.delete(
      `/admins/${adminId}`
    );


    // Remove deleted admin from UI immediately
    setAdmins(prev =>
      prev.filter(
        admin => admin._id !== adminId
      )
    );


  } catch(error) {

    console.log(
      "Delete admin error:",
      error.response?.data || error.message
    );

  }

};




  const openPermissionModal = (admin) => {


    setSelectedAdmin(admin);


    setPermissions(admin.permissions || []);


    setShowPermissionModal(true);


  };





  const togglePermission = (permission) => {


    setPermissions(prev =>


      prev.includes(permission)

        ? prev.filter(item => item !== permission)

        : [...prev, permission]


    );


  };





  const toggleAllPermissions = () => {


    if(permissions.length === allPermissions.length){

      setPermissions([]);


    }else{


      setPermissions(allPermissions);


    }


  };




  const toggleGroupPermissions = (group) => {


    const groupPermissions = permissionGroups[group]

      .map(permission => permission.key);



    const hasAll = groupPermissions.every(permission =>

      permissions.includes(permission)

    );



    if(hasAll){


      setPermissions(prev =>

        prev.filter(item =>

          !groupPermissions.includes(item)

        )

      );


    }else{


      setPermissions(prev =>

        [

          ...new Set([

            ...prev,

            ...groupPermissions

          ])

        ]

      );


    }


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

      <div

        className="
          flex
          justify-center
          items-center
          h-60
          text-white
        "

      >

        Loading admins...

      </div>

    );


  }





  return (

    <div

      className="
        min-h-screen
        bg-slate-950
        p-6
        text-white
      "

    >




      <div

        className="
          mb-8
          flex
          justify-between
          items-center
          flex-wrap
          gap-4
        "

      >



        <div>


          <h1

            className="
              text-3xl
              font-bold
              flex
              items-center
              gap-3
            "

          >


            <FaUserShield/>


            Admin Management


          </h1>



          <p

            className="
              text-gray-400
              mt-2
            "

          >


            Manage administrators and their permissions.


          </p>



        </div>






        <div

          className="
            flex
            gap-3
          "

        >



          <button


            onClick={() => navigate(-1)}


            className="
              bg-gray-600
              hover:bg-gray-700
              px-5
              py-3
              rounded-xl
              flex
              items-center
              gap-2
            "


          >


            <FaArrowLeft/>


            Back


          </button>





          <button


            onClick={() => setShowCreateModal(true)}


            className="
              bg-green-600
              hover:bg-green-700
              px-5
              py-3
              rounded-xl
              flex
              items-center
              gap-2
            "


          >


            <FaPlus/>


            Add Admin


          </button>



        </div>



      </div>






      <div

        className="
          bg-white/10
          border
          border-white/10
          rounded-2xl
          overflow-hidden
        "

      >



        <div className="overflow-x-auto">


          <table className="w-full">



            <thead>


              <tr

                className="
                  border-b
                  border-white/10
                  text-gray-300
                "

              >



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


                      <span

                        className="
                          px-3
                          py-1
                          rounded-full
                          bg-green-600/20
                          text-green-400
                          text-sm
                        "

                      >


                        {admin.role}


                      </span>


                    </td>





                    <td className="p-4">


                      <span

                        className="
                          bg-blue-600/20
                          text-blue-400
                          px-3
                          py-1
                          rounded-full
                          text-sm
                        "

                      >


                        {admin.permissions?.length || 0}

                        {" "}

                        permissions


                      </span>


                    </td>





<td className="p-4">

  <div className="flex gap-2">


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
        px-4
        py-2
        rounded-xl
      "

    >

      <FaUserShield/>

      Manage


    </button>





    <button

      onClick={() =>
        deleteAdmin(admin._id)
      }

      disabled={
        admin.role === "super_admin"
      }

      className="
        bg-red-600
        hover:bg-red-700
        disabled:bg-gray-600
        px-4
        py-2
        rounded-xl
      "

    >

      Delete


    </button>



  </div>


</td>



                  </tr>



                ))

              }


            </tbody>



          </table>



        </div>



      </div>
      {
        showCreateModal && (

          <div

            className="
              fixed
              inset-0
              bg-black/60
              flex
              items-center
              justify-center
              z-50
            "

          >


            <div

              className="
                bg-slate-900
                border
                border-white/10
                rounded-2xl
                p-6
                w-full
                max-w-md
              "

            >



              <div

                className="
                  flex
                  justify-between
                  items-center
                  mb-6
                "

              >


                <h2 className="text-xl font-bold">

                  Create Admin

                </h2>



                <button

                  onClick={() =>
                    setShowCreateModal(false)
                  }

                >

                  <FaTimes/>

                </button>



              </div>





              <div className="space-y-4">



                <input

                  placeholder="Full Name"

                  value={newAdmin.fullName}

                  onChange={(e) =>

                    setNewAdmin({

                      ...newAdmin,

                      fullName:e.target.value

                    })

                  }


                  className="
                    w-full
                    bg-slate-800
                    border
                    border-white/10
                    rounded-xl
                    px-4
                    py-3
                  "

                />





                <input

                  placeholder="Email"

                  type="email"

                  value={newAdmin.email}


                  onChange={(e) =>

                    setNewAdmin({

                      ...newAdmin,

                      email:e.target.value

                    })

                  }


                  className="
                    w-full
                    bg-slate-800
                    border
                    border-white/10
                    rounded-xl
                    px-4
                    py-3
                  "

                />






                <input

                  placeholder="Password"

                  type="password"


                  value={newAdmin.password}


                  onChange={(e) =>

                    setNewAdmin({

                      ...newAdmin,

                      password:e.target.value

                    })

                  }


                  className="
                    w-full
                    bg-slate-800
                    border
                    border-white/10
                    rounded-xl
                    px-4
                    py-3
                  "

                />







                <select


                  value={newAdmin.role}


                  onChange={(e) =>

                    setNewAdmin({

                      ...newAdmin,

                      role:e.target.value

                    })

                  }


                  className="
                    w-full
                    bg-slate-800
                    border
                    border-white/10
                    rounded-xl
                    px-4
                    py-3
                  "


                >



                  <option value="admin">

                    Admin

                  </option>



                  {/* <option value="super_admin">

                    Super Admin

                  </option> */}



                </select>



              </div>







              <button


                onClick={createAdmin}


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


                Create Admin


              </button>




            </div>



          </div>


        )

      }







      {
        showPermissionModal && (

          <div

            className="
              fixed
              inset-0
              bg-black/60
              flex
              items-center
              justify-center
              z-50
            "

          >




            <div

              className="
                bg-slate-900
                border
                border-white/10
                rounded-2xl
                p-6
                w-full
                max-w-lg
              "

            >




              <div

                className="
                  flex
                  justify-between
                  items-center
                  mb-6
                "

              >



                <div>


                  <h2 className="text-xl font-bold">

                    Manage Permissions

                  </h2>




                  <p className="text-gray-400 text-sm">


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






              <div

                className="
                  space-y-3
                  max-h-80
                  overflow-y-auto
                "

              >



                <div className="space-y-5">



                  {/* SELECT ALL */}



                  <label

                    className="
                      flex
                      items-center
                      gap-3
                      bg-green-600/20
                      p-3
                      rounded-lg
                      cursor-pointer
                    "

                  >



                    <input


                      type="checkbox"


                      checked={
                        permissions.length === allPermissions.length
                      }


                      onChange={toggleAllPermissions}


                    />



                    <span className="font-semibold">

                      Select All Permissions

                    </span>



                  </label>
                  {
                    Object.keys(permissionGroups).map(group => (


                      <div

                        key={group}

                        className="
                          bg-white/5
                          rounded-xl
                          p-4
                        "

                      >



                        <div

                          className="
                            flex
                            justify-between
                            items-center
                            mb-3
                          "

                        >



                          <h3

                            className="
                              font-bold
                              text-green-400
                            "

                          >


                            {group}


                          </h3>





                          <label

                            className="
                              text-sm
                              flex
                              items-center
                              gap-2
                            "

                          >



                            <input


                              type="checkbox"


                              checked={

                                permissionGroups[group]

                                  .every(item =>

                                    permissions.includes(item.key)

                                  )

                              }


                              onChange={() =>

                                toggleGroupPermissions(group)

                              }


                            />



                            Select All



                          </label>




                        </div>








                        <div className="space-y-2">



                          {

                            permissionGroups[group].map(permission => (



                              <label


                                key={permission.key}


                                className="
                                  flex
                                  items-center
                                  gap-3
                                  bg-slate-800
                                  p-3
                                  rounded-lg
                                  cursor-pointer
                                "


                              >




                                <input


                                  type="checkbox"


                                  checked={

                                    permissions.includes(
                                      permission.key
                                    )

                                  }


                                  onChange={() =>

                                    togglePermission(
                                      permission.key
                                    )

                                  }


                                />





                                <span>


                                  {permission.label}


                                </span>




                              </label>



                            ))

                          }





                        </div>





                      </div>



                    ))

                  }





                </div>





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