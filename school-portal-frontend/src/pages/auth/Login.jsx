import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";


function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");


  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      const response = await api.post("/auth/login", {
        email,
        password,
      });


      localStorage.setItem(
        "token",
        response.data.token
      );


      navigate("/dashboard");


    } catch (error) {

      setError(
        error.response?.data?.message ||
        "Login failed"
      );

    }

  };


  return (

    <div className="
      min-h-screen
      flex
      items-center
      justify-center
      bg-gray-100
      px-4
    ">

      <form
        onSubmit={handleSubmit}
        className="
          bg-white
          shadow
          rounded-xl
          p-8
          w-full
          max-w-md
        "
      >

        <h1 className="
          text-2xl
          font-bold
          mb-6
          text-center
        ">
          Admin Login
        </h1>


        {error && (
          <p className="text-red-500 mb-4">
            {error}
          </p>
        )}


        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="
            w-full
            border
            p-3
            rounded
            mb-4
          "
        />


        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          className="
            w-full
            border
            p-3
            rounded
            mb-6
          "
        />


        <button
          className="
            w-full
            bg-blue-600
            text-white
            p-3
            rounded
            hover:bg-blue-700
          "
        >
          Login
        </button>


      </form>

    </div>

  );
}


export default Login;