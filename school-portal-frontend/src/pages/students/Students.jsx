import { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";

function Students() {

  const [students, setStudents] = useState([]);
const [pagination, setPagination] = useState(null);
const [loading, setLoading] = useState(true);
const [page, setPage] = useState(1);
const [search, setSearch] = useState("");


 const fetchStudents = useCallback(async () => {

  try {

    const response = await api.get(
      `/students?page=${page}&limit=10&search=${search}`
    );

    setStudents(response.data.students);

    setPagination(response.data.pagination);

  } catch (error) {

    console.log(
      "Students error:",
      error.response?.data || error.message
    );

  } finally {

    setLoading(false);

  }

}, [page, search]);

useEffect(() => {

  const loadStudents = async () => {
    await fetchStudents();
  };

  loadStudents();

}, [fetchStudents]);


  if (loading) {

    return (
      <div className="text-center mt-10">
        Loading students...
      </div>
    );

  }



  return (

    <div>

      <div className="flex justify-between items-center mb-6">

        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Students
          </h1>

          <p className="text-gray-500">
            Manage registered students
          </p>
        </div>


        <button
          className="
            bg-blue-600
            text-white
            px-5
            py-2
            rounded-lg
            hover:bg-blue-700
          "
        >
          Add Student
        </button>

      </div>


      <div className="mb-5">

  <input
    type="text"
    placeholder="Search student..."
    value={search}
    onChange={(e) => {
      setSearch(e.target.value);
      setPage(1);
    }}
    className="
      border
      rounded-lg
      px-4
      py-2
      w-full
      md:w-96
    "
  />

</div>



      <div className="
        bg-white
        rounded-xl
        shadow
        overflow-x-auto
      ">


        <table className="w-full">


          <thead>

            <tr className="border-b bg-gray-50">

              <th className="p-4 text-left">
                Student ID
              </th>

              <th className="p-4 text-left">
                Name
              </th>

              <th className="p-4 text-left">
                Gender
              </th>

              <th className="p-4 text-left">
                Class
              </th>

              <th className="p-4 text-left">
                Session
              </th>

              <th className="p-4 text-left">
                Action
              </th>

            </tr>

          </thead>



          <tbody>


          {students.map((student)=>(

            <tr
              key={student.studentId}
              className="border-b hover:bg-gray-50"
            >


              <td className="p-4">
                {student.studentId}
              </td>


              <td className="p-4">
                {student.firstName} {student.lastName}
              </td>


              <td className="p-4">
                {student.gender}
              </td>


              <td className="p-4">
                {student.currentClass}
              </td>


              <td className="p-4">
                {student.session}
              </td>


              <td className="p-4">

                <button
                  className="
                    text-blue-600
                    hover:underline
                  "
                >
                  View
                </button>

              </td>


            </tr>

          ))}


          </tbody>


        </table>


      </div>


     {pagination && (

  <div className="
    mt-5
    flex
    justify-between
    items-center
  ">


    <button

      disabled={page === 1}

      onClick={() => setPage(page - 1)}

      className="
        px-4
        py-2
        rounded
        bg-gray-200
        disabled:opacity-50
      "

    >
      Previous
    </button>



    <p className="text-gray-600">

      Page {pagination.currentPage} of {pagination.totalPages}

    </p>



    <button

      disabled={page === pagination.totalPages}

      onClick={() => setPage(page + 1)}

      className="
        px-4
        py-2
        rounded
        bg-blue-600
        text-white
        disabled:opacity-50
      "

    >
      Next
    </button>


  </div>

)}


    </div>

  );

}


export default Students;