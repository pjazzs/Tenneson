import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";


function StudentDetails() {

  const { studentId } = useParams();
  const navigate = useNavigate();


  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);



  useEffect(() => {

    const fetchStudent = async () => {

      try {

        const response = await api.get(
          `/students/${studentId}`
        );

        setStudent(response.data.student);


      } catch (error) {

        console.log(
          "Student details error:",
          error.response?.data || error.message
        );

      } finally {

        setLoading(false);

      }

    };


    fetchStudent();

  }, [studentId]);




  const handleDelete = async () => {

    const confirmDelete = window.confirm(
      "Are you sure you want to archive this student?"
    );


    if (!confirmDelete) return;


    try {

      await api.delete(
        `/students/${student.studentId}`
      );


      navigate("/students");


    } catch(error) {

      console.log(
        "Delete error:",
        error.response?.data || error.message
      );

    }

  };




  if (loading) {

    return (
      <div className="text-center mt-10">
        Loading student details...
      </div>
    );

  }




  if (!student) {

    return (
      <div className="text-center mt-10">
        Student not found
      </div>
    );

  }




  return (

    <div>


      <div className="
        flex
        justify-between
        items-center
        mb-6
      ">


        <h1 className="
          text-3xl
          font-bold
          text-gray-800
        ">
          Student Details
        </h1>



        <div className="flex gap-3">


          <button

            onClick={() =>
              navigate(`/students/${student.studentId}/edit`)
            }

            className="
              bg-blue-600
              text-white
              px-5
              py-2
              rounded
            "

          >
            Edit

          </button>




          <button

            onClick={handleDelete}

            className="
              bg-red-600
              text-white
              px-5
              py-2
              rounded
            "

          >
            Delete

          </button>




          <button

            onClick={() => navigate("/students")}

            className="
              bg-gray-600
              text-white
              px-5
              py-2
              rounded
            "

          >
            Back

          </button>



        </div>


      </div>





      <div className="
        bg-white
        shadow
        rounded-xl
        p-6
        grid
        grid-cols-1
        md:grid-cols-2
        gap-6
      ">



        <Info
          label="Student ID"
          value={student.studentId}
        />



        <Info
          label="First Name"
          value={student.firstName}
        />



        <Info
          label="Last Name"
          value={student.lastName}
        />



        <Info
          label="Other Name"
          value={student.otherName || "N/A"}
        />



        <Info
          label="Gender"
          value={student.gender}
        />



        <Info
          label="Date of Birth"
          value={
            student.dateOfBirth
              ? new Date(student.dateOfBirth).toLocaleDateString()
              : "N/A"
          }
        />



        <Info
          label="Class"
          value={student.currentClass}
        />



        <Info
          label="Session"
          value={student.session}
        />



        <Info
          label="Parent Name"
          value={student.parentName}
        />



        <Info
          label="Parent Phone"
          value={student.parentPhone}
        />



        <Info
          label="Status"
          value={
            student.isActive
              ? "Active"
              : "Archived"
          }
        />



      </div>


    </div>

  );

}





function Info({ label, value }) {

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



export default StudentDetails;