import { useEffect, useState } from "react";
import api from "../../api/axios";


function ActivityLogs() {


  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);



  useEffect(() => {


    const fetchLogs = async () => {


      try {


        const response = await api.get(
          "/students/activity-logs"
        );


        setLogs(response.data.logs);



      } catch(error) {


        console.log(
          "Activity logs error:",
          error.response?.data || error.message
        );


      } finally {


        setLoading(false);


      }


    };


    fetchLogs();


  }, []);




  if(loading){

    return (

      <div className="text-center mt-10">

        Loading activity logs...

      </div>

    );

  }




  return (

    <div>


      <h1
        className="
          text-3xl
          font-bold
          text-gray-800
          mb-6
        "
      >
        Activity Logs
      </h1>





      <div
        className="
          bg-white
          shadow
          rounded-xl
          overflow-x-auto
        "
      >


        <table className="w-full">


          <thead>

            <tr
              className="
                border-b
                bg-gray-50
              "
            >


              <th className="p-4 text-left">
                Date
              </th>


              <th className="p-4 text-left">
                Admin
              </th>


              <th className="p-4 text-left">
                Action
              </th>


              <th className="p-4 text-left">
                Student ID
              </th>


              <th className="p-4 text-left">
                Details
              </th>


            </tr>

          </thead>




          <tbody>


            {
              logs.length === 0 ? (

                <tr>

                  <td
                    colSpan="5"
                    className="
                      text-center
                      p-5
                      text-gray-500
                    "
                  >
                    No activity found
                  </td>

                </tr>


              ) : (


                logs.map((log)=>(


                  <tr
                    key={log._id}
                    className="border-b"
                  >


                    <td className="p-4">

                      {
                        new Date(
                          log.createdAt
                        ).toLocaleString()
                      }

                    </td>



                    <td className="p-4">

                      {
                        log.admin?.fullName ||
                        "Unknown"
                      }

                    </td>




                    <td className="p-4">

                      <span
                        className="
                          bg-blue-100
                          text-blue-700
                          px-3
                          py-1
                          rounded-full
                          text-sm
                        "
                      >
                        {log.action}
                      </span>

                    </td>




                    <td className="p-4">

                      {
                        log.studentId ||
                        "N/A"
                      }

                    </td>




                    <td className="p-4">

                      {log.details}

                    </td>



                  </tr>


                ))

              )
            }


          </tbody>


        </table>


      </div>


    </div>

  );

}



export default ActivityLogs;