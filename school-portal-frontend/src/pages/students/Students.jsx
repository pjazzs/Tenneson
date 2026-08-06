import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  FaPlus,
  FaSearch,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaFileExcel,
} from "react-icons/fa";

import api from "../../api/axios";


function Students() {

  const navigate = useNavigate();


  /* -----------------------------
      STATE
  ------------------------------ */


  const [students, setStudents] = useState([]);

  const [pagination, setPagination] = useState(null);

  const [loading, setLoading] = useState(true);


  const [page, setPage] = useState(1);


  const [searchInput, setSearchInput] = useState("");

  const [search, setSearch] = useState("");


  const [classFilter, setClassFilter] = useState("");

  const [genderFilter, setGenderFilter] = useState("");

  const [sessionFilter, setSessionFilter] = useState("");

  const [statusFilter, setStatusFilter] = useState("");




  /* -----------------------------
      HELPERS
  ------------------------------ */


  const clearAllFilters = () => {

    setSearch("");

    setSearchInput("");

    setClassFilter("");

    setGenderFilter("");

    setSessionFilter("");

    setStatusFilter("");

    setPage(1);

  };




  const removeFilter = (filter) => {

    switch (filter) {


      case "search":

        setSearch("");

        setSearchInput("");

        break;



      case "class":

        setClassFilter("");

        break;



      case "gender":

        setGenderFilter("");

        break;



      case "session":

        setSessionFilter("");

        break;



      case "status":

        setStatusFilter("");

        break;



      default:

        break;

    }


    setPage(1);

  };





  const hasActiveFilters =
    search ||
    classFilter ||
    genderFilter ||
    sessionFilter ||
    statusFilter;





  /* -----------------------------
      SEARCH DEBOUNCE
  ------------------------------ */


  useEffect(() => {


    const timer = setTimeout(() => {


      setSearch(searchInput.trim());


    }, 500);



    return () => clearTimeout(timer);



  }, [searchInput]);






  /* -----------------------------
      FETCH STUDENTS
  ------------------------------ */


  useEffect(() => {


    const fetchStudents = async () => {


      try {


        setLoading(true);



        const params = {

          page,

          limit: 10,

        };




        if (search)
          params.search = search;


        if (classFilter)
          params.class = classFilter;


        if (genderFilter)
          params.gender = genderFilter;


        if (sessionFilter)
          params.session = sessionFilter;


        if (statusFilter)
          params.status = statusFilter;




        const response = await api.get(

          "/students",

          {

            params,

          }

        );




        setStudents(

          response.data.students || []

        );




        setPagination(

          response.data.pagination

        );




      } catch (error) {


        console.log(

          error.response?.data || error.message

        );



      } finally {


        setLoading(false);


      }


    };



    fetchStudents();



  }, [

    page,

    search,

    classFilter,

    genderFilter,

    sessionFilter,

    statusFilter,

  ]);


const exportStudents = async () => {

  try {

    const response = await api.get(
      "/students/export",
      {
        responseType: "blob",
      }
    );


    const blob = new Blob(
      [response.data],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );


    const url =
      window.URL.createObjectURL(blob);


    const link =
      document.createElement("a");


    link.href = url;


    link.download =
      "Students.xlsx";


    document.body.appendChild(link);


    link.click();


    link.remove();


    window.URL.revokeObjectURL(url);


  } catch(error) {


    console.log(
      "Export error:",
      error.response?.data || error.message
    );


  }

};



  return (


    <div className="text-white">



      {/* HEADER */}



      <div

        className="
          flex
          justify-between
          items-center
          flex-wrap
          gap-5
          mb-8
        "

      >



        <div>


          <h1

            className="
              text-3xl
              font-bold
              tracking-tight
              text-gray-900
            "

          >

            Students


          </h1>




          <p

            className="
              text-gray-600
              mt-2
            "

          >

            Manage registered students and monitor
            student records.


          </p>



        </div>


        <button

  onClick={exportStudents}

  className="
    flex
    items-center
    gap-2
    bg-emerald-600
    hover:bg-emerald-700
    active:scale-95
    transition-all
    duration-200
    px-5
    py-3
    rounded-xl
    shadow-lg
  "

>

  <FaFileExcel />

  Export

</button>





        <button


          onClick={() =>
            navigate("/students/add")
          }


          className="
            flex
            items-center
            gap-2
            bg-green-600
            hover:bg-green-700
            active:scale-95
            transition-all
            duration-200
            px-5
            py-3
            rounded-xl
            shadow-lg
          "


        >



          <FaPlus />


          Add Student



        </button>




      </div>






      {/* ============================
            FILTERS
      ============================= */}


      <div

        className="
          bg-slate-900
          border
          border-white/10
          rounded-2xl
          p-5
          shadow-xl
          mb-6
        "

      >



        <div

          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-6
            gap-4
            items-center
          "

        >



          {/* SEARCH */}



          <div

            className="
              relative
              lg:col-span-2
            "

          >



            <FaSearch

              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-gray-400
              "

            />



            <input

              type="text"

              placeholder="Search student..."

              value={searchInput}


              onChange={(e)=>{

                setSearchInput(e.target.value);

                setPage(1);

              }}


              className="
                w-full
                h-12
                bg-slate-800
                border
                border-white/10
                rounded-xl
                pl-12
                pr-4
                text-white
                placeholder-gray-400
                focus:outline-none
                focus:border-green-500
              "


            />



          </div>
                    {/* CLASS */}


          <select

            value={classFilter}

            onChange={(e)=>{

              setClassFilter(e.target.value);

              setPage(1);

            }}

            className="
              h-12
              w-full
              min-w-0
              bg-slate-800
              border
              border-white/10
              rounded-xl
              px-3
              text-sm
              text-white
              truncate
              focus:outline-none
              focus:border-green-500
            "

          >

            <option value="">
              All Classes
            </option>

            <option value="JSS1">
              JSS1
            </option>

            <option value="JSS2">
              JSS2
            </option>

            <option value="JSS3">
              JSS3
            </option>

            <option value="SS1">
              SS1
            </option>

            <option value="SS2">
              SS2
            </option>

            <option value="SS3">
              SS3
            </option>


          </select>






          {/* GENDER */}



          <select

            value={genderFilter}

            onChange={(e)=>{

              setGenderFilter(e.target.value);

              setPage(1);

            }}


            className="
              h-12
              w-full
              min-w-0
              bg-slate-800
              border
              border-white/10
              rounded-xl
              px-3
              text-sm
              text-white
              truncate
              focus:outline-none
              focus:border-green-500
            "


          >


            <option value="">
              All Gender
            </option>


            <option value="Male">
              Male
            </option>


            <option value="Female">
              Female
            </option>


          </select>







          {/* SESSION */}



          <select

            value={sessionFilter}

            onChange={(e)=>{

              setSessionFilter(e.target.value);

              setPage(1);

            }}


            className="
              h-12
              w-full
              min-w-0
              bg-slate-800
              border
              border-white/10
              rounded-xl
              px-3
              text-sm
              text-white
              truncate
              focus:outline-none
              focus:border-green-500
            "


          >


            <option value="">
              All Sessions
            </option>


            <option value="2025/2026">
              2025/2026
            </option>


            <option value="2026/2027">
              2026/2027
            </option>


          </select>







          {/* STATUS */}



          <select

            value={statusFilter}

            onChange={(e)=>{

              setStatusFilter(e.target.value);

              setPage(1);

            }}


            className="
              h-12
              w-full
              min-w-0
              bg-slate-800
              border
              border-white/10
              rounded-xl
              px-3
              text-sm
              text-white
              truncate
              focus:outline-none
              focus:border-green-500
            "


          >


            <option value="">
              All Status
            </option>


            <option value="active">
              Active
            </option>


            <option value="archived">
              Archived
            </option>


          </select>



        </div>






        {/* ============================
              ACTIVE FILTERS
        ============================= */}



        {hasActiveFilters && (



          <div

            className="
              mt-6
              border-t
              border-white/10
              pt-5
            "

          >



            <div

              className="
                flex
                flex-wrap
                items-center
                gap-3
              "

            >



              <span

                className="
                  text-sm
                  text-gray-400
                  font-medium
                "

              >

                Active Filters:

              </span>





              {search && (


                <button

                  onClick={() =>
                    removeFilter("search")
                  }


                  className="
                    flex
                    items-center
                    gap-2
                    bg-blue-500/20
                    text-blue-300
                    rounded-full
                    px-3
                    py-1.5
                    text-sm
                    hover:bg-blue-500/30
                    transition
                  "

                >


                  Search: {search}


                  <FaTimes size={10}/>


                </button>


              )}






              {classFilter && (


                <button

                  onClick={() =>
                    removeFilter("class")
                  }


                  className="
                    flex
                    items-center
                    gap-2
                    bg-green-500/20
                    text-green-300
                    rounded-full
                    px-3
                    py-1.5
                    text-sm
                    hover:bg-green-500/30
                    transition
                  "

                >


                  Class: {classFilter}


                  <FaTimes size={10}/>


                </button>


              )}






              {genderFilter && (


                <button

                  onClick={() =>
                    removeFilter("gender")
                  }


                  className="
                    flex
                    items-center
                    gap-2
                    bg-pink-500/20
                    text-pink-300
                    rounded-full
                    px-3
                    py-1.5
                    text-sm
                    hover:bg-pink-500/30
                    transition
                  "

                >


                  Gender: {genderFilter}


                  <FaTimes size={10}/>


                </button>


              )}






              {sessionFilter && (


                <button

                  onClick={() =>
                    removeFilter("session")
                  }


                  className="
                    flex
                    items-center
                    gap-2
                    bg-yellow-500/20
                    text-yellow-300
                    rounded-full
                    px-3
                    py-1.5
                    text-sm
                    hover:bg-yellow-500/30
                    transition
                  "

                >


                  Session: {sessionFilter}


                  <FaTimes size={10}/>


                </button>


              )}






              {statusFilter && (


                <button

                  onClick={() =>
                    removeFilter("status")
                  }


                  className="
                    flex
                    items-center
                    gap-2
                    bg-purple-500/20
                    text-purple-300
                    rounded-full
                    px-3
                    py-1.5
                    text-sm
                    hover:bg-purple-500/30
                    transition
                  "

                >


                  Status: {statusFilter}


                  <FaTimes size={10}/>


                </button>


              )}






              <button

                onClick={clearAllFilters}


                className="
                  ml-auto
                  text-sm
                  text-red-400
                  hover:text-red-300
                  font-medium
                "

              >

                Clear All

              </button>



            </div>



          </div>


        )}



      </div>






      {/* ============================
            RESULTS SUMMARY
      ============================= */}



      <div

        className="
          flex
          justify-between
          items-center
          mb-4
        "

      >



        <p className="text-sm text-gray-400">


          Showing


          <span

            className="
              text-green-400
              font-semibold
              mx-1
            "

          >

            {students.length}

          </span>


          of


          <span

            className="
              text-green-400
              font-semibold
              mx-1
            "

          >

            {pagination?.totalStudents || 0}

          </span>


          students


        </p>





        {pagination && (


          <p className="text-xs text-gray-500">

            Page {pagination.currentPage} of {pagination.totalPages}

          </p>


        )}



      </div>





      {/* TABLE */}



      <div

        className="
          bg-slate-900
          border
          border-white/10
          rounded-2xl
          shadow-xl
          overflow-hidden
        "

      >



        <div className="overflow-x-auto">



          <table

            className="
              w-full
              table-fixed
              text-sm
            "

          >



            <thead>


              <tr

                className="
                  border-b
                  border-white/10
                  text-gray-400
                "

              >


                <th className="px-3 py-4 text-left w-[30%]">
                  Student
                </th>


                <th className="px-3 py-4 text-left w-[15%]">
                  ID
                </th>


                <th className="px-3 py-4 text-left w-[10%]">
                  Gender
                </th>


                <th className="px-3 py-4 text-left w-[12%]">
                  Class
                </th>


                <th className="px-3 py-4 text-left w-[15%]">
                  Session
                </th>


                <th className="px-3 py-4 text-left w-[10%]">
                  Status
                </th>


                <th className="px-3 py-4 text-left w-[8%]">
                  Action
                </th>


              </tr>


            </thead>
            <tbody>


{loading ? (


  <tr>

    <td
      colSpan="7"
      className="
        text-center
        py-12
        text-gray-400
      "
    >

      <div
        className="
          flex
          flex-col
          items-center
          gap-3
        "
      >

        <div
          className="
            w-8
            h-8
            border-4
            border-green-500
            border-t-transparent
            rounded-full
            animate-spin
          "
        />

        Loading students...

      </div>


    </td>


  </tr>



) : students.length === 0 ? (



  <tr>

    <td
      colSpan="7"
      className="py-14"
    >

      <div
        className="
          flex
          flex-col
          items-center
          justify-center
          text-center
          gap-4
        "
      >

        <div className="text-5xl">
          🔍
        </div>


        <h3
          className="
            text-lg
            font-semibold
            text-white
          "
        >
          No students found
        </h3>


        <p
          className="
            text-gray-400
            max-w-md
          "
        >
          No students match your current filters.
          Try removing some filters or search terms.
        </p>



        {hasActiveFilters && (

          <button

            onClick={clearAllFilters}

            className="
              mt-2
              bg-green-600
              hover:bg-green-700
              px-5
              py-2
              rounded-xl
              transition
              text-sm
            "

          >

            Clear Filters

          </button>

        )}



      </div>


    </td>


  </tr>



) : (



students.map((student)=>(


<tr

  key={student.studentId}


  onClick={() =>
    navigate(
      `/students/${student.studentId}`
    )
  }


  className="
    border-b
    border-white/10
    hover:bg-green-500/5
    transition
    cursor-pointer
    select-none
  "

>



{/* STUDENT */}


<td
  className="
    px-3
    py-4
  "
>

  <div
    className="
      flex
      items-center
      gap-3
      min-w-0
    "
  >


    {student.photo?.url ? (

      <img

        src={student.photo.url}

        alt="student"

        className="
          w-10
          h-10
          rounded-full
          object-cover
          shrink-0
        "

      />


    ) : (


      <div

        className="
          w-10
          h-10
          rounded-full
          bg-green-600
          flex
          items-center
          justify-center
          font-bold
          text-sm
          shrink-0
        "

      >

        {student.firstName?.[0]}

        {student.lastName?.[0]}


      </div>


    )}



    <div className="min-w-0">


      <p
        className="
          text-gray-200
          font-medium
          truncate
        "
      >

        {student.firstName} {student.lastName}

      </p>



      {student.otherName && (

        <p
          className="
            text-xs
            text-gray-500
            truncate
          "
        >

          {student.otherName}

        </p>

      )}



    </div>


  </div>


</td>





{/* ID */}


<td
  className="
    px-3
    py-4
    text-gray-300
    truncate
  "
>

  {student.studentId}

</td>





{/* GENDER */}


<td
  className="
    px-3
    py-4
    text-gray-300
  "
>

  {student.gender}

</td>





{/* CLASS */}


<td
  className="
    px-3
    py-4
    text-gray-300
  "
>

  {student.currentClass}

</td>





{/* SESSION */}


<td
  className="
    px-3
    py-4
    text-gray-300
  "
>

  {student.session}

</td>





{/* STATUS */}


<td
  className="
    px-3
    py-4
  "
>


<span

className={`

  inline-flex

  px-3

  py-1

  rounded-full

  text-xs

  font-medium


  ${
    student.isActive

    ? "bg-green-500/20 text-green-400"

    : "bg-red-500/20 text-red-400"

  }

`}

>


{student.isActive
  ? "Active"
  : "Archived"
}


</span>


</td>





{/* ACTION */}


<td
  className="
    px-3
    py-4
  "
>


<button


  onClick={(e)=>{


    e.stopPropagation();


    navigate(
      `/students/${student.studentId}`
    );


  }}



  className="
    flex
    items-center
    gap-2
    bg-blue-600
    hover:bg-blue-700
    px-3
    py-2
    rounded-lg
    text-xs
    transition
  "


>


<FaEye size={12}/>


View


</button>



</td>




</tr>



))


)}


</tbody>


</table>


</div>


</div>






{/* PAGINATION */}



{pagination && (


<div

className="
  flex
  justify-between
  items-center
  mt-6
"

>


<button


disabled={page === 1}


onClick={() =>
  setPage(page - 1)
}


className="
  flex
  items-center
  gap-2
  bg-slate-800
  hover:bg-slate-700
  px-4
  py-2
  rounded-lg
  text-sm
  disabled:opacity-40
"


>


<FaChevronLeft/>


Previous


</button>





<p

className="
  text-gray-400
  text-sm
"

>


Page {pagination.currentPage} of {pagination.totalPages}


</p>





<button


disabled={
  page === pagination.totalPages
}


onClick={() =>
  setPage(page + 1)
}


className="
  flex
  items-center
  gap-2
  bg-green-600
  hover:bg-green-700
  px-4
  py-2
  rounded-lg
  text-sm
  disabled:opacity-40
"


>


Next


<FaChevronRight/>


</button>



</div>


)}



</div>


);


}


export default Students;