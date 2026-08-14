import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaLock,
  FaSchool,
} from "react-icons/fa";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

function Login() {


  const navigate = useNavigate();


  const [email,setEmail] = useState("");

  const [password,setPassword] = useState("");

  const [error,setError] = useState("");

  const [loading,setLoading] = useState(false);
  const { setAdmin } = useAuth();






  const handleSubmit = async(e)=>{


    e.preventDefault();


    setError("");

    setLoading(true);



    try{


      const response = await api.post(
        "/auth/login",
        {
          email,
          password,
        }
      );



     localStorage.setItem(
  "token",
  response.data.token
);

localStorage.setItem(
  "admin",
  JSON.stringify(response.data.admin)
);

setAdmin(response.data.admin);

navigate("/dashboard");



    }catch(error){


      setError(

        error.response?.data?.message ||
        "Login failed"

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


    <div className="
      min-h-screen
      flex
      items-center
      justify-center
      bg-linear-to-br
      from-slate-950
      via-slate-900
      to-green-950
      px-4
    ">






      <form

        onSubmit={handleSubmit}

        className="
          w-full
          max-w-md
          bg-slate-900/80
          backdrop-blur-xl
          border
          border-white/10
          shadow-2xl
          rounded-3xl
          p-8
        "

      >





        <div className="
          flex
          flex-col
          items-center
          mb-8
        ">


          <div className="
            w-20
            h-20
            rounded-full
            bg-green-600
            flex
            items-center
            justify-center
            text-white
            text-3xl
            shadow-lg
            mb-4
          ">

            <FaSchool/>

          </div>





          <h1 className="
            text-3xl
            font-bold
            text-white
          ">

            Tenneson Portal

          </h1>




          <p className="
            text-gray-400
            mt-2
          ">

            Admin Dashboard Login

          </p>



        </div>









        {
          error && (

            <div className="
              bg-red-600/20
              text-red-400
              border
              border-red-500/20
              p-3
              rounded-xl
              mb-5
            ">

              {error}

            </div>

          )
        }









        <div className="mb-5">


          <label className="
            text-gray-300
            text-sm
            block
            mb-2
          ">

            Email

          </label>



          <input
          id="admin-email"

            type="email"

            placeholder="admin@example.com"

            value={email}

            onChange={(e)=>setEmail(e.target.value)}

            className={inputStyle}

            required

          />


        </div>









        <div className="mb-6">


          <label className="
            text-gray-300
            text-sm
            block
            mb-2
          ">

            Password

          </label>




          <input
          id="admin-password"

            type="password"

            placeholder="Enter password"

            value={password}

            onChange={(e)=>setPassword(e.target.value)}

            className={inputStyle}

            required

          />


        </div>








        <button

          disabled={loading}

          className="
            w-full
            flex
            items-center
            justify-center
            gap-3
            bg-green-600
            hover:bg-green-700
            text-white
            py-3
            rounded-xl
            font-semibold
            transition
            disabled:opacity-50
          "

        >


          <FaLock/>


          {
            loading
            ?
            "Logging in..."
            :
            "Login"
          }



        </button>






      </form>





    </div>


  );


}


export default Login;