import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";


function VerifyStudent() {


  const { studentId } = useParams();


  const [student, setStudent] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");





  useEffect(() => {


    const verifyStudent = async () => {


      try {


        const response = await api.get(
          `/students/qrcode/verify/${studentId}`
        );


        setStudent(response.data.student);



      } catch (error) {


        setError(
          error.response?.data?.message ||
          "Student verification failed"
        );


      } finally {


        setLoading(false);


      }


    };



    verifyStudent();


  }, [studentId]);








  if (loading) {


    return (

      <div className="text-center mt-10">

        Verifying student...

      </div>

    );


  }








  if (error) {


    return (

      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-gray-100
        "
      >

        <div
          className="
            bg-white
            shadow
            rounded-xl
            p-8
            text-center
          "
        >

          <h1 className="text-2xl font-bold text-red-600">

            Verification Failed

          </h1>


          <p className="mt-3 text-gray-600">

            {error}

          </p>


        </div>


      </div>

    );


  }







  return (


    <div
      className="
        min-h-screen
        bg-gray-100
        flex
        items-center
        justify-center
      "
    >



      <div
        className="
          bg-white
          shadow-xl
          rounded-xl
          p-8
          w-full
          max-w-md
        "
      >


        <h1
          className="
            text-2xl
            font-bold
            text-green-600
            text-center
          "
        >

          ✓ Verified Student

        </h1>





        <div className="mt-6 space-y-4">


          <Info
            label="Student ID"
            value={student.studentId}
          />


          <Info
            label="Name"
            value={`${student.firstName} ${student.lastName}`}
          />


          <Info
            label="Gender"
            value={student.gender}
          />


          <Info
            label="Class"
            value={student.currentClass}
          />


          <Info
            label="Session"
            value={student.session}
          />


        </div>



      </div>


    </div>


  );


}







function Info({label, value}) {


  return (

    <div>

      <p className="text-gray-500">

        {label}

      </p>


      <p className="font-semibold text-gray-800">

        {value}

      </p>


    </div>

  );


}



export default VerifyStudent;