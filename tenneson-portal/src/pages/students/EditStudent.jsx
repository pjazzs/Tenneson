import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaSave,
  FaArrowLeft,
} from "react-icons/fa";
import api from "../../api/axios";


function EditStudent() {


  const { studentId } = useParams();

  const navigate = useNavigate();



  const [formData,setFormData] = useState({

    firstName:"",
    lastName:"",
    otherName:"",
    gender:"",
    dateOfBirth:"",
    currentClass:"",
    session:"",
    parentName:"",
    parentPhone:"",

  });



  const [loading,setLoading] = useState(true);

  const [saving,setSaving] = useState(false);

  const [message,setMessage] = useState("");






  useEffect(()=>{


    const fetchStudent = async()=>{


      try{


        const response = await api.get(
          `/students/${studentId}`
        );


        const student = response.data.student;



        setFormData({

          firstName:student.firstName || "",

          lastName:student.lastName || "",

          otherName:student.otherName || "",

          gender:student.gender || "",

          dateOfBirth:
            student.dateOfBirth
            ?
            student.dateOfBirth.split("T")[0]
            :
            "",

          currentClass:student.currentClass || "",

          session:student.session || "",

          parentName:student.parentName || "",

          parentPhone:student.parentPhone || "",

        });



      }catch(error){


        console.log(
          error.response?.data || error.message
        );


      }finally{


        setLoading(false);


      }


    };


    fetchStudent();


  },[studentId]);








  const handleChange=(e)=>{


    setFormData({

      ...formData,

      [e.target.name]:e.target.value,

    });


  };








  const handleSubmit=async(e)=>{


    e.preventDefault();


    setSaving(true);

    setMessage("");



    try{


      await api.put(

        `/students/${studentId}`,

        formData

      );



      setMessage(
        "Student updated successfully"
      );



      setTimeout(()=>{


        navigate(
          `/students/${studentId}`
        );


      },1000);




    }catch(error){


      setMessage(

        error.response?.data?.message ||
        "Failed to update student"

      );


    }finally{


      setSaving(false);


    }


  };








  const inputStyle = `
    w-full
    bg-slate-800
    border
    border-white/10
    text-white
    rounded-xl
    px-4
    py-3
    outline-none
    focus:border-green-500
  `;








  if(loading){


    return (

      <div className="
        text-white
        text-center
        mt-10
      ">

        Loading student...

      </div>

    );


  }







  return (


    <div className="text-white">



      <div className="
        flex
        justify-between
        items-center
        mb-8
      ">



        <div>

          <h1 className="
            text-3xl
            font-bold
          ">

            Edit Student

          </h1>


          <p className="
            text-gray-400
            mt-2
          ">

            Update student information

          </p>


        </div>





        <button

          onClick={()=>navigate(-1)}

          className="
            flex
            items-center
            gap-2
            bg-slate-800
            px-4
            py-2
            rounded-xl
          "

        >

          <FaArrowLeft/>

          Back

        </button>



      </div>







      {
        message && (

          <div className="
            bg-green-600/20
            text-green-400
            p-4
            rounded-xl
            mb-6
          ">

            {message}

          </div>

        )
      }







      <form

        onSubmit={handleSubmit}

        className="
          bg-slate-900
          border
          border-white/10
          shadow-xl
          rounded-2xl
          p-8
          grid
          grid-cols-1
          md:grid-cols-2
          gap-6
        "

      >






        <input

          name="firstName"

          value={formData.firstName}

          onChange={handleChange}

          placeholder="First Name"

          className={inputStyle}

          required

        />





        <input

          name="lastName"

          value={formData.lastName}

          onChange={handleChange}

          placeholder="Last Name"

          className={inputStyle}

          required

        />






        <input

          name="otherName"

          value={formData.otherName}

          onChange={handleChange}

          placeholder="Other Name"

          className={inputStyle}

        />







        <select

          name="gender"

          value={formData.gender}

          onChange={handleChange}

          className={inputStyle}

        >

          <option value="">
            Select Gender
          </option>


          <option value="Male">
            Male
          </option>


          <option value="Female">
            Female
          </option>


        </select>







        <input

          type="date"

          name="dateOfBirth"

          value={formData.dateOfBirth}

          onChange={handleChange}

          className={inputStyle}

        />







        <input

          name="currentClass"

          value={formData.currentClass}

          onChange={handleChange}

          placeholder="Current Class"

          className={inputStyle}

        />







        <input

          name="session"

          value={formData.session}

          onChange={handleChange}

          placeholder="Session"

          className={inputStyle}

        />







        <input

          name="parentName"

          value={formData.parentName}

          onChange={handleChange}

          placeholder="Parent Name"

          className={inputStyle}

        />







        <input

          name="parentPhone"

          value={formData.parentPhone}

          onChange={handleChange}

          placeholder="Parent Phone"

          className={inputStyle}

        />








        <button

          disabled={saving}

          className="
            md:col-span-2
            flex
            justify-center
            items-center
            gap-3
            bg-green-600
            hover:bg-green-700
            py-3
            rounded-xl
            font-semibold
            disabled:opacity-50
          "

        >

          <FaSave/>


          {
            saving
            ?
            "Saving..."
            :
            "Update Student"
          }


        </button>





      </form>



    </div>


  );


}


export default EditStudent;