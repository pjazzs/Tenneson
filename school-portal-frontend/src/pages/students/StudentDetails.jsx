import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

function StudentDetails() {

  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState("");

  const qrRef = useRef(null);

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

    } catch (error) {

      console.log(
        "Delete error:",
        error.response?.data || error.message
      );

    }

  };



  const generateQR = async () => {

    try {

      const response = await api.get(
        `/students/${student.studentId}/qrcode`
      );

      setQrCode(response.data.qrCode);

      setTimeout(() => {

        qrRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

      }, 100);

    } catch (error) {

      console.log(
        "QR error:",
        error.response?.data || error.message
      );

    }

  };

  const downloadSlip = async () => {

  try {

    const response = await api.get(
      `/students/${student.studentId}/slip`,
      {
        responseType: "blob",
      }
    );


    const file = new Blob(
      [response.data],
      {
        type: "application/pdf",
      }
    );


    const url = window.URL.createObjectURL(file);


    const link = document.createElement("a");

    link.href = url;

    link.download = `${student.studentId}-slip.pdf`;

    document.body.appendChild(link);

    link.click();


    link.remove();

    window.URL.revokeObjectURL(url);



  } catch(error) {


    console.log(
      "Slip download error:",
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

      <div
        className="
          flex
          justify-between
          items-center
          mb-6
        "
      >

        <h1
          className="
            text-3xl
            font-bold
            text-gray-800
          "
        >
          Student Details
        </h1>


        <div className="flex gap-3 flex-wrap">

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
              hover:bg-blue-700
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
              hover:bg-red-700
            "

          >
            Delete
          </button>


          <button

            onClick={generateQR}

            className="
              bg-purple-600
              text-white
              px-5
              py-2
              rounded
              hover:bg-purple-700
            "

          >
            Generate QR
          </button>

          <button

  onClick={downloadSlip}

  className="
    bg-orange-600
    text-white
    px-5
    py-2
    rounded
    hover:bg-orange-700
  "

>
  Download Slip

</button>


          <button

            onClick={() => navigate("/students")}

            className="
              bg-gray-600
              text-white
              px-5
              py-2
              rounded
              hover:bg-gray-700
            "

          >
            Back
          </button>

        </div>

      </div>



      <div
        className="
          bg-white
          shadow
          rounded-xl
          p-6
          grid
          grid-cols-1
          md:grid-cols-2
          gap-6
        "
      >

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



      {qrCode && (

        <div

          ref={qrRef}

          className="
            bg-white
            shadow
            rounded-xl
            p-6
            mt-8
            text-center
          "

        >

          <h2 className="text-2xl font-bold mb-4">
            Student QR Code
          </h2>

          <img
            src={qrCode}
            alt="Student QR Code"
            className="
              mx-auto
              w-60
              border
              p-3
              rounded-lg
            "
          />

          <a

            href={qrCode}

            download={`${student.studentId}-QRCode.png`}

            className="
              inline-block
              mt-6
              bg-green-600
              text-white
              px-6
              py-3
              rounded
              hover:bg-green-700
            "

          >
            Download QR Code
          </a>

        </div>

      )}

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