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
  FaUserGraduate,
  FaCalendarAlt,
  FaSchool,
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




  /*
      FETCH STUDENT
  */


  useEffect(() => {


    const fetchStudent = async () => {


      try {


        const response = await api.get(
          `/students/${studentId}`
        );


        setStudent(
          response.data.student
        );


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





  /*
      UPLOAD PHOTO
  */


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
            "Content-Type":
            "multipart/form-data",
          },
        }

      );



      setStudent(prev => ({

        ...prev,

        photo:
        response.data.photo,

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







  /*
      ARCHIVE STUDENT
  */


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
        "Archive error:",
        error.response?.data || error.message
      );


    }


  };







  /*
      GENERATE QR
  */


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







  /*
      DOWNLOAD SLIP
  */


  const downloadSlip = async () => {


    try {


      const response = await api.get(

        `/students/${student.studentId}/slip`,

        {
          responseType:"blob",
        }

      );



      const file = new Blob(

        [
          response.data
        ],

        {
          type:"application/pdf",
        }

      );



      const url =
        window.URL.createObjectURL(file);



      const link =
        document.createElement("a");



      link.href = url;


      link.download =
        `${student.studentId}-slip.pdf`;



      document.body.appendChild(link);


      link.click();


      link.remove();


      window.URL.revokeObjectURL(url);



    } catch(error) {


      console.log(
        "Slip error:",
        error.response?.data || error.message
      );


    }


  };







  /*
      LOADING STATE
  */


  if(loading){


    return (

      <div
        className="
          flex
          justify-center
          items-center
          h-64
          text-white
        "
      >

        Loading student details...

      </div>

    );


  }






  if(!student){


    return (

      <div
        className="
          text-center
          mt-10
          text-white
        "
      >

        Student not found

      </div>

    );


  }






  return (

    <div className="text-white">

      
      {/* ============================
            PAGE HEADER
      ============================= */}


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
            "
          >

            Student Profile

          </h1>


          <p
            className="
              text-gray-400
              mt-2
            "
          >

            View and manage student information

          </p>


        </div>





        {/* ACTION BUTTONS */}


        <div
          className="
            flex
            flex-wrap
            gap-3
          "
        >



          <input

            type="file"

            accept="image/*"

            ref={fileRef}

            onChange={uploadPhoto}

            className="hidden"

          />



          <ActionButton

            onClick={() =>
              fileRef.current.click()
            }

            color="green"

            icon={<FaUpload />}

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

            icon={<FaEdit />}

            text="Edit"

          />



          <ActionButton

            onClick={handleDelete}

            color="red"

            icon={<FaTrash />}

            text="Archive"

          />



          <ActionButton

            onClick={generateQR}

            color="purple"

            icon={<FaQrcode />}

            text="QR Code"

          />



          <ActionButton

            onClick={downloadSlip}

            color="orange"

            icon={<FaDownload />}

            text="Slip"

          />



          <ActionButton

            onClick={() =>
              navigate("/students")
            }

            color="gray"

            icon={<FaArrowLeft />}

            text="Back"

          />



        </div>


      </div>






      {/* ============================
          PROFILE SUMMARY CARD
      ============================= */}



      <div
        className="
          bg-slate-900
          border
          border-white/10
          rounded-2xl
          shadow-xl
          p-6
          mb-8
        "
      >



        <div
          className="
            flex
            flex-col
            lg:flex-row
            gap-8
            items-center
          "
        >



          {/* AVATAR */}


          <div>


            {
              student.photo?.url ? (


                <img

                  src={student.photo.url}

                  alt="Student"

                  className="
                    w-40
                    h-40
                    rounded-full
                    object-cover
                    border-4
                    border-green-500
                    shadow-xl
                  "

                />


              ) : (


                <div

                  className="
                    w-40
                    h-40
                    rounded-full
                    bg-green-600
                    flex
                    items-center
                    justify-center
                    text-5xl
                    font-bold
                    shadow-xl
                  "

                >

                  {student.firstName?.[0]}

                  {student.lastName?.[0]}


                </div>


              )

            }


          </div>







          {/* STUDENT BASIC INFO */}



          <div
            className="
              flex-1
              text-center
              lg:text-left
            "
          >



            <h2
              className="
                text-3xl
                font-bold
              "
            >

              {student.firstName}

              {" "}

              {student.lastName}


            </h2>




            <p
              className="
                text-gray-400
                mt-2
                text-lg
              "
            >

              {student.studentId}

            </p>





            <div
              className="
                flex
                flex-wrap
                justify-center
                lg:justify-start
                gap-3
                mt-5
              "
            >


              <Badge>

                <FaSchool/>

                {student.currentClass}

              </Badge>



              <Badge>

                <FaCalendarAlt/>

                {student.session}

              </Badge>



              <Badge>

                <FaUserGraduate/>

                {student.gender}

              </Badge>




              <span

                className={`

                  inline-flex

                  items-center

                  gap-2

                  px-4

                  py-2

                  rounded-full

                  text-sm

                  font-medium


                  ${
                    student.isActive

                    ?

                    "bg-green-500/20 text-green-400"

                    :

                    "bg-red-500/20 text-red-400"

                  }

                `}

              >

                {student.isActive
                  ?
                  "Active Student"
                  :
                  "Archived Student"
                }


              </span>



            </div>



          </div>




        </div>



      </div>








      {/* ============================
            INFORMATION SECTIONS
      ============================= */}



      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-3
          gap-6
        "
      >





        {/* PERSONAL */}



        <InfoSection

          title="Personal Information"

        >


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


        </InfoSection>








        {/* ACADEMIC */}



        <InfoSection

          title="Academic Information"

        >


          <Info

            label="Student ID"

            value={student.studentId}

          />


          <Info

            label="Class"

            value={student.currentClass}

          />


          <Info

            label="Session"

            value={student.session}

          />



        </InfoSection>








        {/* PARENT */}



        <InfoSection

          title="Parent Information"

        >


          <Info

            label="Parent Name"

            value={
              student.parentName
            }

          />


          <Info

            label="Parent Phone"

            value={
              student.parentPhone
            }

          />


        </InfoSection>



      </div>
      




      {/* ============================
            QR VERIFICATION SECTION
      ============================= */}



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



            <h2
              className="
                text-2xl
                font-bold
                mb-3
              "
            >

              Student Verification QR

            </h2>




            <p
              className="
                text-gray-400
                mb-6
              "
            >

              Scan this QR code to verify student information.

            </p>





            <div
              className="
                inline-block
                bg-white
                p-5
                rounded-2xl
                shadow-lg
              "
            >

              <img

                src={qrCode}

                alt="Student QR Code"

                className="
                  w-60
                  h-60
                "

              />

            </div>





            <div
              className="
                mt-6
                text-gray-300
              "
            >

              <p>

                Verification ID:

              </p>


              <p
                className="
                  font-bold
                  text-green-400
                  mt-1
                "
              >

                {student.studentId}

              </p>


            </div>






            <a

              href={qrCode}

              download={
                `${student.studentId}-QRCode.png`
              }

              className="
                inline-flex
                items-center
                gap-2
                mt-6
                bg-green-600
                hover:bg-green-700
                px-6
                py-3
                rounded-xl
                font-semibold
                transition
              "

            >

              <FaDownload/>

              Download QR


            </a>




          </div>


        )

      }




    </div>

  );

}








/*
    ACTION BUTTON COMPONENT
*/


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

        text-sm

        transition

        shadow-lg

        active:scale-95
      `}

    >

      {icon}

      {text}


    </button>

  );


}








/*
    SMALL BADGE COMPONENT
*/


function Badge({
  children
}) {


  return (

    <span

      className="
        inline-flex
        items-center
        gap-2
        px-4
        py-2
        rounded-full
        bg-white/5
        border
        border-white/10
        text-sm
        text-gray-300
      "

    >

      {children}


    </span>


  );


}








/*
    INFORMATION SECTION
*/


function InfoSection({
  title,
  children
}) {


  return (

    <div

      className="
        bg-slate-900
        border
        border-white/10
        rounded-2xl
        p-5
        shadow-xl
      "

    >



      <h3

        className="
          text-lg
          font-bold
          mb-5
        "

      >

        {title}


      </h3>




      <div

        className="
          space-y-3
        "

      >

        {children}


      </div>



    </div>


  );


}








/*
    INFORMATION ITEM
*/


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
        p-3
      "

    >



      <p

        className="
          text-gray-400
          text-xs
        "

      >

        {label}


      </p>




      <p

        className="
          font-semibold
          mt-1
          text-sm
          truncate
        "

      >

        {value || "N/A"}


      </p>




    </div>


  );


}






export default StudentDetails;


