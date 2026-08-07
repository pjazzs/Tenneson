import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import useAuth from "../../hooks/useAuth";

import BulkImportStudents from "../../components/students/BulkImportStudents";

import {
  FaPlus,
  FaSearch,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaFileExcel,
  FaSpinner,
} from "react-icons/fa";

import api from "../../api/axios";


function Students() {

  const navigate = useNavigate();

  const { hasPermission } = useAuth();


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

  const [exporting, setExporting] = useState(false);

  const [refresh, setRefresh] = useState(0);


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


  // const removeFilter = (filter) => {

  //   switch (filter) {

  //     case "search":

  //       setSearch("");

  //       setSearchInput("");

  //       break;


  //     case "class":

  //       setClassFilter("");

  //       break;


  //     case "gender":

  //       setGenderFilter("");

  //       break;


  //     case "session":

  //       setSessionFilter("");

  //       break;


  //     case "status":

  //       setStatusFilter("");

  //       break;


  //     default:

  //       break;

  //   }


  //   setPage(1);

  // };


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


        if (search) {

          params.search = search;

        }


        if (classFilter) {

          params.class = classFilter;

        }


        if (genderFilter) {

          params.gender = genderFilter;

        }


        if (sessionFilter) {

          params.session = sessionFilter;

        }


        if (statusFilter) {

          params.status = statusFilter;

        }


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

      }

      catch (error) {

        console.log(

          "Fetch students error:",

          error.response?.data || error.message

        );

      }

      finally {

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

    refresh,

  ]);


  /* -----------------------------
     EXPORT STUDENTS
  ------------------------------ */

  const exportStudents = async () => {

    try {

      setExporting(true);


      const params = {};


      if (search) {

        params.search = search;

      }


      if (classFilter) {

        params.class = classFilter;

      }


      if (genderFilter) {

        params.gender = genderFilter;

      }


      if (sessionFilter) {

        params.session = sessionFilter;

      }


      if (statusFilter) {

        params.status = statusFilter;

      }


      const response = await api.get(

        "/students/export",

        {
          params,

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


      const url = window.URL.createObjectURL(blob);


      const link = document.createElement("a");

      link.href = url;

      link.download = "Students.xlsx";


      document.body.appendChild(link);

      link.click();

      link.remove();


      window.URL.revokeObjectURL(url);

    }

    catch (error) {

      console.log(

        "Export error:",

        error.response?.data || error.message

      );

    }

    finally {

      setExporting(false);

    }

  };


  /* -----------------------------
     RENDER
  ------------------------------ */

  return (

    <div className="w-full text-white">


      {/* ============================
          HEADER
      ============================= */}

      <div
        className="
          flex
          flex-col
          md:flex-row
          md:justify-between
          md:items-center
          gap-5
          mb-8
        "
      >


        {/* PAGE TITLE */}

        <div>

          <h1
            className="
              text-2xl
              sm:text-3xl
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
              text-sm
              sm:text-base
              max-w-xl
            "
          >

            Manage registered students and monitor
            student records.

          </p>

        </div>


        {/* ACTION BUTTONS */}

        <div
          className="
            flex
            flex-col
            sm:flex-row
            gap-3
            w-full
            md:w-auto
          "
        >


          {/* BULK IMPORT */}

          {
            hasPermission("students.import") && (

              <div className="w-full sm:w-auto">

                <BulkImportStudents

                  onImportSuccess={() => {

                    setRefresh(
                      prev => prev + 1
                    );

                  }}

                />

              </div>

            )
          }


          {/* EXPORT */}

          {
            hasPermission("students.export") && (

              <button

                onClick={exportStudents}

                disabled={exporting}

                className="
                  flex
                  items-center
                  justify-center
                  gap-2
                  bg-green-600
                  hover:bg-green-700
                  active:scale-95
                  px-5
                  py-3
                  rounded-xl
                  transition
                  shadow-lg
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  w-full
                  sm:w-auto
                  whitespace-nowrap
                "

              >

                {
                  exporting ? (

                    <FaSpinner
                      className="animate-spin"
                    />

                  ) : (

                    <FaFileExcel />

                  )
                }


                {
                  exporting
                    ? "Exporting..."
                    : "Export Excel"
                }

              </button>

            )
          }


          {/* ADD STUDENT */}

          {
            hasPermission("students.create") && (

              <button

                onClick={() =>
                  navigate("/students/add")
                }

                className="
                  flex
                  items-center
                  justify-center
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
                  w-full
                  sm:w-auto
                  whitespace-nowrap
                "

              >

                <FaPlus />

                Add Student

              </button>

            )
          }


        </div>


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
          p-4
          sm:p-5
          shadow-xl
          mb-6
        "
      >


        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            xl:grid-cols-6
            gap-4
            items-center
          "
        >


          {/* SEARCH */}

          <div
            className="
              relative
              xl:col-span-2
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

              onChange={(e) => {

                setSearchInput(
                  e.target.value
                );

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
                text-sm
                sm:text-base
              "

            />

          </div>


          {/* CLASS */}

          <select

            value={classFilter}

            onChange={(e) => {

              setClassFilter(
                e.target.value
              );

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

            onChange={(e) => {

              setGenderFilter(
                e.target.value
              );

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

            onChange={(e) => {

              setSessionFilter(
                e.target.value
              );

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

            onChange={(e) => {

              setStatusFilter(
                e.target.value
              );

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
        RESULTS SUMMARY
  ============================= */}

  <div
    className="
      flex
      flex-col
      sm:flex-row
      sm:justify-between
      sm:items-center
      gap-2
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

      <p
        className="
          text-xs
          text-gray-500
          sm:text-right
        "
      >
        Page {pagination.currentPage} of {pagination.totalPages}
      </p>

    )}

  </div>


  {/* ============================
        TABLE
  ============================= */}

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

    {/* Horizontal scroll is intentional on mobile */}
    <div className="overflow-x-auto">

      <table
        className="
          w-full
          min-w-225
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

            <th
              className="
                px-4
                py-4
                text-left
                w-[30%]
                whitespace-nowrap
              "
            >
              Student
            </th>


            <th
              className="
                px-4
                py-4
                text-left
                w-[15%]
                whitespace-nowrap
              "
            >
              ID
            </th>


            <th
              className="
                px-4
                py-4
                text-left
                w-[10%]
                whitespace-nowrap
              "
            >
              Gender
            </th>


            <th
              className="
                px-4
                py-4
                text-left
                w-[12%]
                whitespace-nowrap
              "
            >
              Class
            </th>


            <th
              className="
                px-4
                py-4
                text-left
                w-[15%]
                whitespace-nowrap
              "
            >
              Session
            </th>


            <th
              className="
                px-4
                py-4
                text-left
                w-[10%]
                whitespace-nowrap
              "
            >
              Status
            </th>


            <th
              className="
                px-4
                py-4
                text-left
                w-[8%]
                whitespace-nowrap
              "
            >
              Action
            </th>

          </tr>

        </thead>


        <tbody>

          {/* ============================
                LOADING
          ============================= */}

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

            /* ============================
                  NO STUDENTS
            ============================= */

            <tr>

              <td
                colSpan="7"
                className="
                  py-14
                  px-4
                "
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
                      text-sm
                    "
                  >
                    No students match your current
                    filters. Try removing some
                    filters or search terms.
                  </p>


                  {hasActiveFilters && (

                    <button
                      onClick={clearAllFilters}
                      className="
                        mt-2
                        bg-green-600
                        hover:bg-green-700
                        active:scale-95
                        px-5
                        py-2.5
                        rounded-xl
                        transition
                        text-sm
                        font-medium
                      "
                    >
                      Clear Filters
                    </button>

                  )}

                </div>

              </td>

            </tr>

          ) : (

            /* ============================
                  STUDENTS
            ============================= */

            students.map((student) => (

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

                {/* ============================
                      STUDENT
                ============================= */}

                <td
                  className="
                    px-4
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
                        alt={`${student.firstName} ${student.lastName}`}
                        className="
                          w-10
                          h-10
                          rounded-full
                          object-cover
                          shrink-0
                          border
                          border-white/10
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


                    <div
                      className="
                        min-w-0
                      "
                    >

                      <p
                        className="
                          text-gray-200
                          font-medium
                          truncate
                          max-w-55
                        "
                      >
                        {student.firstName}{" "}
                        {student.lastName}
                      </p>


                      {student.otherName && (

                        <p
                          className="
                            text-xs
                            text-gray-500
                            truncate
                            max-w-55
                          "
                        >
                          {student.otherName}
                        </p>

                      )}

                    </div>

                  </div>

                </td>


                {/* ============================
                      ID
                ============================= */}

                <td
                  className="
                    px-4
                    py-4
                    text-gray-300
                    font-medium
                    whitespace-nowrap
                  "
                >
                  {student.studentId}
                </td>


                {/* ============================
                      GENDER
                ============================= */}

                <td
                  className="
                    px-4
                    py-4
                    text-gray-300
                    whitespace-nowrap
                  "
                >
                  {student.gender}
                </td>


                {/* ============================
                      CLASS
                ============================= */}

                <td
                  className="
                    px-4
                    py-4
                    text-gray-300
                    whitespace-nowrap
                  "
                >
                  {student.currentClass}
                </td>


                {/* ============================
                      SESSION
                ============================= */}

                <td
                  className="
                    px-4
                    py-4
                    text-gray-300
                    whitespace-nowrap
                  "
                >
                  {student.session}
                </td>


                {/* ============================
                      STATUS
                ============================= */}

                <td
                  className="
                    px-4
                    py-4
                  "
                >

                  <span
                    className={`
                      inline-flex
                      items-center
                      px-3
                      py-1
                      rounded-full
                      text-xs
                      font-medium
                      whitespace-nowrap
                      ${
                        student.isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }
                    `}
                  >

                    {student.isActive
                      ? "Active"
                      : "Archived"}

                  </span>

                </td>


                {/* ============================
                      ACTION
                ============================= */}

                <td
                  className="
                    px-4
                    py-4
                  "
                >

                  <button
                    onClick={(e) => {

                      e.stopPropagation();

                      navigate(
                        `/students/${student.studentId}`
                      );

                    }}
                    className="
                      flex
                      items-center
                      justify-center
                      gap-2
                      bg-blue-600
                      hover:bg-blue-700
                      active:scale-95
                      px-3
                      py-2
                      min-h-10
                      rounded-lg
                      text-xs
                      transition
                      whitespace-nowrap
                    "
                  >

                    <FaEye />

                    <span>
                      View
                    </span>

                  </button>

                </td>

              </tr>

            ))

          )}

        </tbody>

      </table>

    </div>

  </div>


  {/* ============================
        MOBILE SCROLL HINT
  ============================= */}

  {!loading && students.length > 0 && (

    <p
      className="
        md:hidden
        text-center
        text-xs
        text-gray-500
        mt-2
      "
    >
      Swipe left or right to view
      all student information.
    </p>

  )}


  {/* ============================
        PAGINATION
  ============================= */}

  {pagination && pagination.totalPages > 0 && (

    <div
      className="
        flex
        flex-col
        sm:flex-row
        justify-between
        items-center
        gap-4
        mt-6
        pb-4
      "
    >

      {/* PREVIOUS */}

      <button
        disabled={page === 1}
        onClick={() =>
          setPage((prev) => prev - 1)
        }
        className="
          flex
          items-center
          justify-center
          gap-2
          bg-slate-800
          hover:bg-slate-700
          active:scale-95
          px-5
          py-2.5
          min-h-10.5
          rounded-lg
          text-sm
          transition
          disabled:opacity-40
          disabled:cursor-not-allowed
          w-full
          sm:w-auto
        "
      >

        <FaChevronLeft size={12} />

        Previous

      </button>


      {/* PAGE INFORMATION */}

      <div
        className="
          text-gray-400
          text-sm
          text-center
          order-first
          sm:order-0
        "
      >

        Page

        <span
          className="
            text-white
            font-semibold
            mx-1
          "
        >
          {pagination.currentPage}
        </span>

        of

        <span
          className="
            text-white
            font-semibold
            mx-1
          "
        >
          {pagination.totalPages}
        </span>

      </div>


      {/* NEXT */}

      <button
        disabled={
          page === pagination.totalPages
        }
        onClick={() =>
          setPage((prev) => prev + 1)
        }
        className="
          flex
          items-center
          justify-center
          gap-2
          bg-green-600
          hover:bg-green-700
          active:scale-95
          px-5
          py-2.5
          min-h-10.5
          rounded-lg
          text-sm
          transition
          disabled:opacity-40
          disabled:cursor-not-allowed
          w-full
          sm:w-auto
        "
      >

        Next

        <FaChevronRight size={12} />

      </button>

    </div>

  )}
  {pagination && pagination.totalPages > 0 && (

  <div>
    {/* pagination */}
  </div>

)}

</div>

);


</div>
  )
}

export default Students;