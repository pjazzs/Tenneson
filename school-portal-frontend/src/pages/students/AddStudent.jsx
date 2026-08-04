import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";


function AddStudent() {

  const navigate = useNavigate();


  const [formData, setFormData] = useState({

    firstName: "",
    lastName: "",
    otherName: "",
    gender: "",
    dateOfBirth: "",
    currentClass: "",
    session: "",
    parentName: "",
    parentPhone: "",

  });


  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");



  const handleChange = (e) => {

    setFormData({

      ...formData,

      [e.target.name]: e.target.value,

    });

  };



  const handleSubmit = async (e) => {

    e.preventDefault();

    setLoading(true);
    setMessage("");


    try {

      await api.post("/students", formData);


      setMessage("Student added successfully");


      setTimeout(() => {

        navigate("/students");

      }, 1500);



    } catch (error) {

      setMessage(
        error.response?.data?.message ||
        "Failed to add student"
      );

    } finally {

      setLoading(false);

    }

  };



  return (

    <div>

      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Add Student
      </h1>


      {message && (

        <div className="
          bg-blue-100
          text-blue-700
          p-3
          rounded
          mb-5
        ">
          {message}
        </div>

      )}



      <form
        onSubmit={handleSubmit}
        className="
          bg-white
          shadow
          rounded-xl
          p-6
          grid
          grid-cols-1
          md:grid-cols-2
          gap-5
        "
      >


        <input
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />


        <input
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />


        <input
          name="otherName"
          placeholder="Other Name"
          value={formData.otherName}
          onChange={handleChange}
          className="border p-3 rounded"
        />



        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="border p-3 rounded"
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
          className="border p-3 rounded"
          required
        />



        <input
          name="currentClass"
          placeholder="Current Class"
          value={formData.currentClass}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />



        <input
          name="session"
          placeholder="Session e.g 2026/2027"
          value={formData.session}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />



        <input
          name="parentName"
          placeholder="Parent Name"
          value={formData.parentName}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />



        <input
          name="parentPhone"
          placeholder="Parent Phone"
          value={formData.parentPhone}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />



        <button
          disabled={loading}
          className="
            bg-blue-600
            text-white
            py-3
            rounded
            hover:bg-blue-700
            md:col-span-2
          "
        >

          {loading ? "Adding..." : "Add Student"}

        </button>


      </form>


    </div>

  );

}


export default AddStudent;