import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  FaCheckCircle,
  FaTimesCircle,
  FaUserGraduate,
  FaIdCard,
} from "react-icons/fa";

import api from "../../api/axios";


function VerifyStudent() {


  const {
    studentId,
  } = useParams();


  const [student, setStudent] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");




  useEffect(() => {


    const verifyStudent = async () => {


      try {


        setLoading(true);

        setError("");


        const response = await api.get(
          `/students/qrcode/verify/${studentId}`
        );


        setStudent(
          response.data.student
        );


      } catch (error) {


        setError(
          error.response?.data?.message ||
          "Unable to verify student."
        );


      } finally {


        setLoading(false);


      }


    };



    verifyStudent();


  }, [studentId]);





  /*
  =========================================
  LOADING
  =========================================
  */

  if (loading) {


    return (

      <div
        className="
          min-h-screen
          bg-slate-950
          flex
          items-center
          justify-center
          text-white
        "
      >

        <div
          className="
            flex
            flex-col
            items-center
            gap-4
          "
        >

          <div
            className="
              w-10
              h-10
              border-4
              border-green-500
              border-t-transparent
              rounded-full
              animate-spin
            "
          />


          <p>
            Verifying student...
          </p>


        </div>

      </div>

    );

  }





  /*
  =========================================
  VERIFICATION FAILED
  =========================================
  */

  if (error || !student) {


    return (

      <div
        className="
          min-h-screen
          bg-slate-950
          flex
          items-center
          justify-center
          p-5
          text-white
        "
      >


        <div
          className="
            bg-slate-900
            border
            border-red-500/20
            rounded-2xl
            p-8
            max-w-md
            w-full
            text-center
            shadow-xl
          "
        >


          <FaTimesCircle
            className="
              text-red-500
              text-5xl
              mx-auto
              mb-5
            "
          />


          <h1
            className="
              text-2xl
              font-bold
              mb-3
            "
          >

            Verification Failed

          </h1>


          <p
            className="
              text-gray-400
            "
          >

            {error || "Student not found."}

          </p>


        </div>


      </div>

    );

  }





  /*
  =========================================
  VERIFIED STUDENT
  =========================================
  */

  return (

    <div
      className="
        min-h-screen
        bg-slate-950
        flex
        items-center
        justify-center
        p-5
        text-white
      "
    >


      <div
        className="
          w-full
          max-w-md
          bg-slate-900
          border
          border-white/10
          rounded-3xl
          shadow-2xl
          overflow-hidden
        "
      >


        {/* =========================================
            HEADER
        ========================================= */}

        <div
          className="
            bg-green-600
            p-6
            text-center
          "
        >


          <FaCheckCircle
            className="
              text-white
              text-5xl
              mx-auto
              mb-3
            "
          />


          <h1
            className="
              text-2xl
              font-bold
            "
          >

            Verified Student

          </h1>


          <p
            className="
              text-green-100
              mt-1
            "
          >

            Student record confirmed

          </p>


        </div>




        {/* =========================================
            STUDENT PHOTO
        ========================================= */}

        <div
          className="
            flex
            justify-center
            mt-6
          "
        >


          {student.photo?.url ? (

            <img
              src={student.photo.url}
              alt={`${student.firstName || ""} ${student.lastName || ""}`}
              className="
                w-28
                h-28
                rounded-full
                object-cover
                border-4
                border-green-500
              "
            />

          ) : (

            <div
              className="
                w-28
                h-28
                rounded-full
                bg-green-600
                flex
                items-center
                justify-center
                text-3xl
                font-bold
              "
            >

              {student.firstName?.[0] || ""}
              {student.lastName?.[0] || ""}

            </div>

          )}


        </div>




        {/* =========================================
            STUDENT DETAILS
        ========================================= */}

        <div
          className="
            p-6
            space-y-4
          "
        >


          {/* NAME */}

          <div
            className="
              text-center
              mb-6
            "
          >

            <h2
              className="
                text-2xl
                font-bold
              "
            >

              {student.firstName} {student.lastName}

            </h2>


            {student.otherName && (

              <p
                className="
                  text-gray-400
                "
              >

                {student.otherName}

              </p>

            )}

          </div>




          {/* ID + GENDER */}

          <div
            className="
              grid
              grid-cols-2
              gap-4
            "
          >


            <div
              className="
                bg-slate-800
                rounded-xl
                p-4
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-gray-400
                  text-sm
                  mb-2
                "
              >

                <FaIdCard />

                Student ID

              </div>


              <p
                className="
                  font-semibold
                "
              >

                {student.studentId}

              </p>

            </div>




            <div
              className="
                bg-slate-800
                rounded-xl
                p-4
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-gray-400
                  text-sm
                  mb-2
                "
              >

                <FaUserGraduate />

                Gender

              </div>


              <p
                className="
                  font-semibold
                "
              >

                {student.gender}

              </p>

            </div>


          </div>




          {/* CURRENT CLASS */}

          <div
            className="
              bg-slate-800
              rounded-xl
              p-4
            "
          >

            <p
              className="
                text-gray-400
                text-sm
                mb-1
              "
            >

              Current Class

            </p>


            <p
              className="
                font-semibold
              "
            >

              {student.currentClass}

            </p>


          </div>




          {/* SESSION */}

          <div
            className="
              bg-slate-800
              rounded-xl
              p-4
            "
          >

            <p
              className="
                text-gray-400
                text-sm
                mb-1
              "
            >

              Session

            </p>


            <p
              className="
                font-semibold
              "
            >

              {student.session}

            </p>


          </div>




          {/* STATUS */}

          <div
            className="
              flex
              justify-center
              mt-5
            "
          >

            <span
              className="
                bg-green-500/20
                text-green-400
                px-5
                py-2
                rounded-full
                text-sm
                font-semibold
              "
            >

              ACTIVE STUDENT

            </span>

          </div>


        </div>




        {/* =========================================
            FOOTER
        ========================================= */}

        <div
          className="
            border-t
            border-white/10
            p-4
            text-center
            text-xs
            text-gray-500
          "
        >

          This verification is generated from the school
          student management system.

        </div>


      </div>


    </div>

  );


}


export default VerifyStudent;