import { useEffect, useState } from "react";
import api from "../../api/axios";


function ArchivedStudents() {


  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);




  useEffect(() => {


    let ignore = false;



    const loadStudents = async () => {


      try {


        const response = await api.get(
          "/students/archived"
        );



        if (!ignore) {

          setStudents(response.data.students);

        }



      } catch (error) {


        console.log(
          "Archived students error:",
          error.response?.data || error.message
        );



      } finally {


        if (!ignore) {

          setLoading(false);

        }


      }


    };



    loadStudents();



    return () => {

      ignore = true;

    };


  }, []);







  const restoreStudent = async (studentId) => {


    const confirmRestore = window.confirm(
      "Restore this student?"
    );



    if (!confirmRestore) return;




    try {



      await api.patch(
        `/students/${studentId}/restore`
      );



      window.location.reload();



    } catch (error) {



      console.log(
        "Restore error:",
        error.response?.data || error.message
      );


    }


  };







  if (loading) {


    return (

      <div className="text-center mt-10">

        Loading archived students...

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

        Archived Students

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
                Student ID
              </th>



              <th className="p-4 text-left">
                Name
              </th>



              <th className="p-4 text-left">
                Class
              </th>



              <th className="p-4 text-left">
                Action
              </th>



            </tr>


          </thead>






          <tbody>



            {students.length === 0 ? (


              <tr>


                <td
                  colSpan="4"
                  className="
                    text-center
                    p-5
                    text-gray-500
                  "
                >

                  No archived students found

                </td>


              </tr>



            ) : (



              students.map((student) => (



                <tr
                  key={student.studentId}
                  className="border-b"
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


                      onClick={() =>
                        restoreStudent(student.studentId)
                      }



                      className="
                        bg-green-600
                        text-white
                        px-4
                        py-2
                        rounded
                        hover:bg-green-700
                      "


                    >

                      Restore


                    </button>



                  </td>




                </tr>


              ))


            )}



          </tbody>




        </table>




      </div>



    </div>

  );


}



export default ArchivedStudents;