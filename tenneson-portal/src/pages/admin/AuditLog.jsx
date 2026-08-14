import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../../api/axios";


function AuditLog() {

  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);


  useEffect(() => {

    const fetchLogs = async () => {

      try {

        const response = await api.get(
          "/audit"
        );


        setLogs(
          response.data.logs
        );


      } catch (error) {

        console.log(
          error.response?.data || error.message
        );

      } finally {

        setLoading(false);

      }

    };


    fetchLogs();

  }, []);


  return (

    <div className="text-white">


      {/* =========================================
          PAGE HEADER
      ========================================= */}

      <div
        className="
          flex
          flex-col
          sm:flex-row
          sm:justify-between
          sm:items-center
          gap-4
          mb-6
        "
      >


        <div>

          <h1
            className="
              text-3xl
              font-bold
              text-gray-900
            "
          >

            Audit Logs

          </h1>


          <p
            className="
              text-gray-600
              mt-2
            "
          >

            Track important activities performed
            by administrators.

          </p>

        </div>



        <button
          type="button"
          onClick={() =>
            navigate("/dashboard")
          }
          className="
            bg-slate-800
            hover:bg-slate-700
            text-white
            px-5
            py-2
            rounded-xl
            text-sm
            transition
            whitespace-nowrap
            self-start
            sm:self-auto
          "
        >

          ← Back to Dashboard

        </button>


      </div>




      {/* =========================================
          AUDIT LOG TABLE
      ========================================= */}

      <div
        className="
          bg-slate-900
          rounded-2xl
          border
          border-white/10
          overflow-hidden
        "
      >


        {/* =========================================
            HORIZONTAL SCROLL CONTAINER

            This allows the table to be swiped
            left/right on mobile.
        ========================================= */}

        <div className="overflow-x-auto">


          <table
            className="
              w-full
              min-w-[900px]
            "
          >


            {/* =====================================
                TABLE HEADER
            ===================================== */}

            <thead>

              <tr
                className="
                  border-b
                  border-white/10
                  text-gray-400
                "
              >


                <th
                  className="
                    p-4
                    text-left
                    whitespace-nowrap
                  "
                >
                  User
                </th>


                <th
                  className="
                    p-4
                    text-left
                    whitespace-nowrap
                  "
                >
                  Action
                </th>


                <th
                  className="
                    p-4
                    text-left
                    whitespace-nowrap
                  "
                >
                  Module
                </th>


                <th
                  className="
                    p-4
                    text-left
                    whitespace-nowrap
                  "
                >
                  Description
                </th>


                <th
                  className="
                    p-4
                    text-left
                    whitespace-nowrap
                  "
                >
                  Date
                </th>


              </tr>

            </thead>




            {/* =====================================
                TABLE BODY
            ===================================== */}

            <tbody>


              {loading ? (

                <tr>

                  <td
                    colSpan="5"
                    className="
                      text-center
                      p-10
                      text-gray-400
                    "
                  >

                    Loading logs...

                  </td>

                </tr>

              ) : logs.length === 0 ? (

                <tr>

                  <td
                    colSpan="5"
                    className="
                      text-center
                      p-10
                      text-gray-400
                    "
                  >

                    No audit logs found.

                  </td>

                </tr>

              ) : (

                logs.map((log) => (

                  <tr
                    key={log._id}
                    className="
                      border-b
                      border-white/10
                      hover:bg-white/5
                    "
                  >


                    {/* USER */}

                    <td
                      className="
                        p-4
                        whitespace-nowrap
                      "
                    >

                      {log.user?.fullName || "System"}

                    </td>




                    {/* ACTION */}

                    <td className="p-4">

                      <span
                        className="
                          bg-blue-500/20
                          text-blue-400
                          px-3
                          py-1
                          rounded-full
                          text-sm
                          whitespace-nowrap
                        "
                      >

                        {log.action}

                      </span>

                    </td>




                    {/* MODULE */}

                    <td
                      className="
                        p-4
                        whitespace-nowrap
                      "
                    >

                      {log.module}

                    </td>




                    {/* DESCRIPTION */}

                    <td
                      className="
                        p-4
                        text-gray-300
                        max-w-md
                      "
                    >

                      {log.description}

                    </td>




                    {/* DATE */}

                    <td
                      className="
                        p-4
                        text-gray-400
                        whitespace-nowrap
                      "
                    >

                      {new Date(
                        log.createdAt
                      ).toLocaleString()}

                    </td>


                  </tr>

                ))

              )}


            </tbody>


          </table>


        </div>


      </div>


    </div>

  );

}


export default AuditLog;