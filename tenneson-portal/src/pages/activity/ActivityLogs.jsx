import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaHistory,
} from "react-icons/fa";
import api from "../../api/axios";


function ActivityLogs() {


  const navigate = useNavigate();


  const [logs,setLogs] = useState([]);

  const [loading,setLoading] = useState(true);







  useEffect(()=>{


    const fetchLogs = async()=>{


      try{


        const response = await api.get(
          "/students/activity-logs"
        );


        setLogs(
          response.data.logs
        );



      }catch(error){


        console.log(
          "Activity logs error:",
          error.response?.data || error.message
        );



      }finally{


        setLoading(false);


      }


    };



    fetchLogs();



  },[]);









  if(loading){


    return (

      <div className="
        text-white
        text-center
        mt-10
      ">

        Loading activity logs...

      </div>

    );


  }







  const getActionStyle = (action)=>{


    if(action.includes("DELETE")){

      return "bg-red-600/20 text-red-400";

    }


    if(action.includes("CREATE")){

      return "bg-green-600/20 text-green-400";

    }


    if(action.includes("UPLOAD")){

      return "bg-purple-600/20 text-purple-400";

    }


    if(action.includes("UPDATE")){

      return "bg-blue-600/20 text-blue-400";

    }


    return "bg-gray-600/20 text-gray-300";


  };









  return (


    <div className="text-white">






      <div className="
        flex
        justify-between
        items-center
        mb-8
      ">



        <div>


          <h1 className="
            text-3xl
            font-bold
            flex
            items-center
            gap-3
            text-gray-900
            pl-6

          ">

            <FaHistory/>

            Activity Logs

          </h1>



          <p className="
            text-gray-600
            mt-2
            pl-6
          ">

            Track all admin activities

          </p>



        </div>






        <button

          onClick={()=>navigate(-1)}

          className="
            flex
            items-center
            gap-2
            bg-slate-800
            px-5
            py-3
            rounded-xl
            hover:bg-slate-700
            mr-5
          "

        >

          <FaArrowLeft/>

          Back


        </button>




      </div>









      <div className="
        bg-slate-900
        border
        border-white/10
        rounded-2xl
        shadow-xl
        overflow-x-auto
      ">



        <table className="w-full">



          <thead>


            <tr className="
              border-b
              border-white/10
              bg-slate-800
            ">



              <th className="
                p-4
                text-left
              ">

                Date

              </th>




              <th className="
                p-4
                text-left
              ">

                Admin

              </th>




              <th className="
                p-4
                text-left
              ">

                Action

              </th>




              <th className="
                p-4
                text-left
              ">

                Student ID

              </th>




              <th className="
                p-4
                text-left
              ">

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
                    p-8
                    text-gray-400
                  "

                >

                  No activity found


                </td>


              </tr>



            ) : (



              logs.map((log)=>(



                <tr

                  key={log._id}

                  className="
                    border-b
                    border-white/10
                    hover:bg-slate-800
                  "

                >





                  <td className="p-4 text-gray-300">


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

                      className={`
                        px-3
                        py-1
                        rounded-full
                        text-sm
                        ${getActionStyle(log.action)}
                      `}

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








                  <td className="
                    p-4
                    text-gray-300
                  ">


                    {
                      log.details ||
                      "No details"
                    }


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