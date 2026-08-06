import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useNavigate,
} from "react-router-dom";

import {
  FaUpload,
  FaEdit,
  FaTrash,
  FaQrcode,
  FaDownload,
  FaArrowLeft,
} from "react-icons/fa";

import api from "../../api/axios";



function StudentDetails() {


  const { studentId } = useParams();

  const navigate = useNavigate();


  const [student, setStudent] = useState(null);

  const [loading, setLoading] = useState(true);

  const [qrCode, setQrCode] = useState("");

  const [uploading, setUploading] = useState(false);



  const fileRef = useRef(null);

  const qrRef = useRef(null);





  useEffect(() => {


    const fetchStudent = async () => {


      try {


        const response = await api.get(
          `/students/${studentId}`
        );


        setStudent(response.data.student);


      } catch(error) {


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









  const uploadPhoto = async (event) => {


    const file = event.target.files[0];


    if(!file) return;



    const formData = new FormData();


    formData.append(
      "photo",
      file
    );



    try {


      setUploading(true);



      const response = await api.patch(

        `/students/${student.studentId}/photo`,

        formData,

        {
          headers:{
            "Content-Type":"multipart/form-data",
          },
        }

      );



      setStudent(prev => ({

        ...prev,

        photo: response.data.photo,

      }));



    } catch(error) {


      console.log(
        "Upload error:",
        error.response?.data || error.message
      );


    } finally {


      setUploading(false);


    }


  };









  const handleDelete = async () => {


    const confirmDelete = window.confirm(
      "Are you sure you want to archive this student?"
    );



    if(!confirmDelete) return;




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









  const generateQR = async () => {


    try {


      const response = await api.get(

        `/students/${student.studentId}/qrcode`

      );



      setQrCode(
        response.data.qrCode
      );



      setTimeout(()=>{


        qrRef.current?.scrollIntoView({

          behavior:"smooth",

          block:"start",

        });


      },100);



    } catch(error) {


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
          responseType:"blob",
        }

      );



      const file = new Blob(

        [response.data],

        {
          type:"application/pdf",
        }

      );



      const url =
        window.URL.createObjectURL(file);



      const link =
        document.createElement("a");



      link.href=url;


      link.download =
        `${student.studentId}-slip.pdf`;



      document.body.appendChild(link);


      link.click();


      link.remove();


      window.URL.revokeObjectURL(url);



    } catch(error){


      console.log(
        "Slip error:",
        error.response?.data || error.message
      );


    }


  };









  if(loading){


    return (

      <div className="
        text-center
        mt-10
        text-white
      ">

        Loading student details...

      </div>

    );


  }






  if(!student){


    return (

      <div className="
        text-center
        mt-10
        text-white
      ">

        Student not found

      </div>

    );


  }







  return (

    <div className="
      text-white
    ">


      <div className="
        flex
        justify-between
        items-center
        flex-wrap
        gap-4
        mb-8
      ">


        <div>

          <h1 className="
            text-3xl
            font-bold
          ">

            Student Profile

          </h1>


          <p className="
            text-gray-400
          ">

            View and manage student information

          </p>


        </div>



        <div className="
          flex
          flex-wrap
          gap-3
        ">


          <input

            type="file"

            accept="image/*"

            ref={fileRef}

            onChange={uploadPhoto}

            className="hidden"

          />



          <ActionButton

            onClick={()=>fileRef.current.click()}

            color="green"

            icon={<FaUpload/>}

            text={
              uploading
              ?
              "Uploading..."
              :
              student.photo?.url
              ?
              "Change Photo"
              :
              "Upload Photo"
            }
          />
           <ActionButton

            onClick={() =>
              navigate(
                `/students/${student.studentId}/edit`
              )
            }

            color="blue"

            icon={<FaEdit/>}

            text="Edit"

          />



          <ActionButton

            onClick={handleDelete}

            color="red"

            icon={<FaTrash/>}

            text="Archive"

          />



          <ActionButton

            onClick={generateQR}

            color="purple"

            icon={<FaQrcode/>}

            text="QR Code"

          />



          <ActionButton

            onClick={downloadSlip}

            color="orange"

            icon={<FaDownload/>}

            text="Slip"

          />



          <ActionButton

            onClick={() =>
              navigate("/students")
            }

            color="gray"

            icon={<FaArrowLeft/>}

            text="Back"

          />


        </div>


      </div>








      {/* Student Profile Card */}


      <div className="
        bg-slate-900
        border
        border-white/10
        shadow-xl
        rounded-2xl
        p-8
      ">


        {/* Avatar */}


        <div className="
          text-center
          mb-8
        ">


          {
            student.photo?.url ? (

              <img

                src={student.photo.url}

                alt="Student"

                className="
                  w-44
                  h-44
                  rounded-full
                  object-cover
                  mx-auto
                  border-4
                  border-green-500
                  shadow-xl
                "

              />


            ) : (


              <div

                className="
                  w-44
                  h-44
                  rounded-full
                  bg-green-600
                  flex
                  items-center
                  justify-center
                  mx-auto
                  text-5xl
                  font-bold
                  shadow-xl
                "

              >

                {
                  student.firstName?.charAt(0)
                }

                {
                  student.lastName?.charAt(0)
                }


              </div>


            )


          }



          <h2 className="
            mt-5
            text-2xl
            font-bold
          ">


            {student.firstName}

            {" "}

            {student.lastName}


          </h2>




          <span className="
            inline-block
            mt-3
            px-4
            py-1
            rounded-full
            text-sm
            bg-green-600/20
            text-green-400
          ">


            {
              student.isActive
              ?
              "Active Student"
              :
              "Archived Student"
            }


          </span>


        </div>








        {/* Details */}


        <div className="
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

            value={
              student.otherName || "N/A"
            }

          />



          <Info

            label="Gender"

            value={student.gender}

          />



          <Info

            label="Date of Birth"

            value={
              student.dateOfBirth
              ?
              new Date(
                student.dateOfBirth
              ).toLocaleDateString()
              :
              "N/A"
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



        </div>


      </div>









      {/* QR Section */}



      {
        qrCode && (


          <div

            ref={qrRef}

            className="
              mt-8
              bg-slate-900
              border
              border-white/10
              rounded-2xl
              shadow-xl
              p-8
              text-center
            "

          >


            <h2 className="
              text-2xl
              font-bold
              mb-6
            ">


              Student Verification QR


            </h2>



            <img

              src={qrCode}

              alt="QR Code"

              className="
                w-60
                mx-auto
                bg-white
                p-4
                rounded-xl
              "

            />



            <a

              href={qrCode}

              download={
                `${student.studentId}-QRCode.png`
              }

              className="
                inline-block
                mt-6
                bg-green-600
                hover:bg-green-700
                px-6
                py-3
                rounded-xl
                font-semibold
              "

            >

              Download QR


            </a>


          </div>


        )

      }



    </div>

  );


}








function ActionButton({
  onClick,
  color,
  icon,
  text,
}) {


  const colors = {


    green:
      "bg-green-600 hover:bg-green-700",


    blue:
      "bg-blue-600 hover:bg-blue-700",


    red:
      "bg-red-600 hover:bg-red-700",


    purple:
      "bg-purple-600 hover:bg-purple-700",


    orange:
      "bg-orange-600 hover:bg-orange-700",


    gray:
      "bg-gray-600 hover:bg-gray-700",


  };



  return (

    <button

      onClick={onClick}

      className={`
        ${colors[color]}
        flex
        items-center
        gap-2
        px-4
        py-2
        rounded-xl
        transition
        shadow-lg
      `}

    >

      {icon}

      {text}


    </button>


  );

}







function Info({
  label,
  value
}) {


  return (

    <div

      className="
        bg-white/5
        border
        border-white/10
        rounded-xl
        p-4
      "

    >


      <p className="
        text-gray-400
        text-sm
      ">

        {label}

      </p>



      <p className="
        font-semibold
        mt-1
      ">

        {value}

      </p>


    </div>

  );


}






export default StudentDetails;
        
          
          
          