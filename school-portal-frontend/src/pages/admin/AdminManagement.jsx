import { useEffect, useState } from "react";
import api from "../../api/axios";

import {
  FaUserShield,
  FaEdit,
} from "react-icons/fa";


function AdminManagement() {


  const [admins, setAdmins] = useState([]);

  const [loading, setLoading] = useState(true);



  useEffect(() => {

    fetchAdmins();

  }, []);




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
        error.response?.data || error.message
      );


    } finally {

      setLoading(false);

    }

  };





  if(loading){

    return (

      <div className="
        text-white
        text-center
        mt-10
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


      <div className="
        mb-8
      ">

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

          Manage administrator accounts and permissions.

        </p>


      </div>






      <div className="
        bg-white/10
        rounded-2xl
        border
        border-white/10
        overflow-hidden
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

              <th className="
                p-4
                text-left
              ">
                Name
              </th>


              <th className="
                p-4
                text-left
              ">
                Email
              </th>


              <th className="
                p-4
                text-left
              ">
                Role
              </th>


              <th className="
                p-4
                text-left
              ">
                Action
              </th>


            </tr>


          </thead>





          <tbody>


            {
              admins.map(admin=>(


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
                    ">

                      {admin.role}

                    </span>


                  </td>




                  <td className="p-4">


                    <button

                      className="
                        flex
                        items-center
                        gap-2
                        bg-blue-600
                        hover:bg-blue-700
                        px-4
                        py-2
                        rounded-xl
                      "

                    >

                      <FaEdit/>

                      Permissions

                    </button>


                  </td>



                </tr>


              ))
            }


          </tbody>


        </table>


      </div>



    </div>

  );

}


export default AdminManagement;