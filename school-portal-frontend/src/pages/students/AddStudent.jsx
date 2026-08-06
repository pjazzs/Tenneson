import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserPlus,
  FaArrowLeft,
} from "react-icons/fa";
import api from "../../api/axios";


function AddStudent() {


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



  const [loading,setLoading] = useState(false);

  const [message,setMessage] = useState("");





  const handleChange = (e)=>{


    setFormData({

      ...formData,

      [e.target.name]:e.target.value,

    });


  };






  const handleSubmit = async(e)=>{


    e.preventDefault();


    setLoading(true);

    setMessage("");



    try{


      await api.post(
        "/students",
        formData
      );


      setMessage(
        "Student added successfully"
      );


      setTimeout(()=>{

        navigate("/students");

      },1200);



    }catch(error){


      setMessage(

        error.response?.data?.message ||
        "Failed to add student"

      );



    }finally{


      setLoading(false);


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
            text-gray-900
          ">

            Add Student

          </h1>


          <p className="
            text-gray-600
            mt-2
          ">

            Register a new student into the portal

          </p>


        </div>





        <button

          onClick={()=>navigate("/students")}

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


          <div className={`
            p-4
            rounded-xl
            mb-6
            ${
              message.includes("success")
              ?
              "bg-green-600/20 text-green-400"
              :
              "bg-red-600/20 text-red-400"
            }
          `}>

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

          placeholder="First Name"

          value={formData.firstName}

          onChange={handleChange}

          className={inputStyle}

          required

        />





        <input

          name="lastName"

          placeholder="Last Name"

          value={formData.lastName}

          onChange={handleChange}

          className={inputStyle}

          required

        />





        <input

          name="otherName"

          placeholder="Other Name"

          value={formData.otherName}

          onChange={handleChange}

          className={inputStyle}

        />







        <select

          name="gender"

          value={formData.gender}

          onChange={handleChange}

          className={inputStyle}

          required

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

          required

        />







        <input

          name="currentClass"

          placeholder="Current Class"

          value={formData.currentClass}

          onChange={handleChange}

          className={inputStyle}

          required

        />







        <input

          name="session"

          placeholder="Session e.g 2026/2027"

          value={formData.session}

          onChange={handleChange}

          className={inputStyle}

          required

        />







        <input

          name="parentName"

          placeholder="Parent Name"

          value={formData.parentName}

          onChange={handleChange}

          className={inputStyle}

          required

        />







        <input

          name="parentPhone"

          placeholder="Parent Phone"

          value={formData.parentPhone}

          onChange={handleChange}

          className={inputStyle}

          required

        />








        <button

          disabled={loading}

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
            transition
            disabled:opacity-50
          "

        >

          <FaUserPlus/>


          {
            loading
            ?
            "Adding Student..."
            :
            "Add Student"
          }


        </button>




      </form>



    </div>


  );


}


export default AddStudent;