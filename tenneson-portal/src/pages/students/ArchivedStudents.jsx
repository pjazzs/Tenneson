import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaTrashRestore,
} from "react-icons/fa";
import api from "../../api/axios";


function ArchivedStudents() {


  const navigate = useNavigate();


  const [students,setStudents] = useState([]);

  const [loading,setLoading] = useState(true);

  const [message,setMessage] = useState("");







  useEffect(()=>{


    const fetchStudents = async()=>{


      try{


        const response = await api.get(
          "/students/archived"
        );


        setStudents(
          response.data.students
        );



      }catch(error){


        console.log(
          "Archived students error:",
          error.response?.data || error.message
        );



      }finally{


        setLoading(false);


      }


    };



    fetchStudents();



  },[]);










  const restoreStudent = async(studentId)=>{


    const confirmRestore = window.confirm(
      "Restore this student?"
    );


    if(!confirmRestore) return;





    try{


      await api.patch(
        `/students/${studentId}/restore`
      );



      setMessage(
        "Student restored successfully"
      );



      setStudents((prev)=>

        prev.filter(
          student =>
          student.studentId !== studentId
        )

      );



    }catch(error){


      console.log(
        "Restore error:",
        error.response?.data || error.message
      );


    }


  };









  if(loading){


    return (

      <div className="
        text-white
        text-center
        mt-10
      ">

        Loading archived students...

      </div>

    );


  }









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
            text-gray-900
            pl-6
          ">

            Archived Students

          </h1>


          <p className="
            text-gray-600
            mt-2
            pl-6
          ">

            Manage deleted student records

          </p>


        </div>





        <button

          onClick={()=>navigate("/students")}

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








      {
        message && (


          <div className="
            bg-green-600/20
            text-green-400
            border
            border-green-500/20
            p-4
            rounded-xl
            mb-6
          ">

            {message}


          </div>


        )
      }









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

                Student ID

              </th>




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

                Class

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
            students.length === 0 ? (


              <tr>

                <td

                  colSpan="4"

                  className="
                    text-center
                    p-6
                    text-gray-400
                  "

                >

                  No archived students found


                </td>


              </tr>



            ) : (



              students.map((student)=>(



                <tr

                  key={student.studentId}

                  className="
                    border-b
                    border-white/10
                    hover:bg-slate-800
                  "

                >



                  <td className="p-4">

                    {student.studentId}

                  </td>




                  <td className="p-4">

                    {student.firstName} {student.lastName}

                  </td>




                  <td className="p-4">

                    {student.currentClass}

                  </td>





                  <td className="p-4">


                    <button

                      onClick={()=>
                        restoreStudent(
                          student.studentId
                        )
                      }

                      className="
                        flex
                        items-center
                        gap-2
                        bg-green-600
                        hover:bg-green-700
                        px-4
                        py-2
                        rounded-xl
                      "

                    >

                      <FaTrashRestore/>

                      Restore


                    </button>


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



export default ArchivedStudents;