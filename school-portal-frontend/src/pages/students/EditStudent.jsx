import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";


function EditStudent() {

  const { studentId } = useParams();
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


  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);



  // Fetch student details

  useEffect(() => {


    const fetchStudent = async () => {

      try {

        const response = await api.get(
          `/students/${studentId}`
        );


        const student = response.data.student;


        setFormData({

          firstName: student.firstName,
          lastName: student.lastName,
          otherName: student.otherName || "",
          gender: student.gender,
          dateOfBirth: student.dateOfBirth?.split("T")[0],
          currentClass: student.currentClass,
          session: student.session,
          parentName: student.parentName,
          parentPhone: student.parentPhone,

        });


      } catch(error) {

        console.log(
          error.response?.data || error.message
        );

      } finally {

        setLoading(false);

      }

    };


    fetchStudent();


  }, [studentId]);




  const handleChange = (e)=>{

    setFormData({

      ...formData,

      [e.target.name]: e.target.value,

    });

  };




  const handleSubmit = async(e)=>{

    e.preventDefault();


    setSaving(true);


    try {


      await api.put(
        `/students/${studentId}`,
        formData
      );


      navigate(
        `/students/${studentId}`
      );


    } catch(error){


      console.log(
        error.response?.data || error.message
      );


    } finally {


      setSaving(false);


    }

  };



  if(loading){

    return (
      <div className="text-center mt-10">
        Loading student...
      </div>
    );

  }




  return (

    <div>


      <h1 className="text-3xl font-bold mb-6">
        Edit Student
      </h1>



      <form

        onSubmit={handleSubmit}

        className="
          bg-white
          rounded-xl
          shadow
          p-6
          grid
          grid-cols-1
          md:grid-cols-2
          gap-5
        "

      >


        {
          Object.keys(formData).map((field)=>(


            <input

              key={field}

              name={field}

              value={formData[field]}

              onChange={handleChange}

              type={
                field === "dateOfBirth"
                ? "date"
                : "text"
              }

              placeholder={field}

              className="
                border
                p-3
                rounded
              "

            />


          ))
        }



        <button

          disabled={saving}

          className="
            bg-blue-600
            text-white
            py-3
            rounded
            md:col-span-2
          "

        >

          {
            saving
            ? "Saving..."
            : "Update Student"
          }


        </button>


      </form>


    </div>

  );

}


export default EditStudent;