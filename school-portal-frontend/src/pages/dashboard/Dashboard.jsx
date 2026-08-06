import {
  useEffect,
  useState,
} from "react";

import api from "../../api/axios";


import {
  FaUsers,
  FaUserCheck,
  FaArchive,
  FaMale,
  FaFemale,
} from "react-icons/fa";


import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";



function Dashboard() {


  const [stats, setStats] = useState(null);

  const [monthlyRegistration, setMonthlyRegistration] = useState([]);

  const [analyticsYear, setAnalyticsYear] = useState(null);





  useEffect(() => {


    const fetchDashboard = async () => {


      try {


        const [
          dashboardResponse,
          analyticsResponse
        ] = await Promise.all([


          api.get(
            "/students/dashboard"
          ),


          api.get(
            "/students/analytics/monthly"
          )


        ]);




        setStats(
          dashboardResponse.data.data
        );



        setMonthlyRegistration(
          analyticsResponse.data.data || []
        );



        setAnalyticsYear(
          analyticsResponse.data.year
        );



      } catch(error) {


        console.log(
          "Dashboard error:",
          error.response?.data || error.message
        );


      }


    };



    fetchDashboard();



  }, []);







  if (!stats) {


    return (

      <div
        className="
          flex
          justify-center
          items-center
          h-60
          bg-slate-950
        "
      >

        <p
          className="
            text-green-400
            text-lg
            font-semibold
          "
        >

          Loading dashboard...

        </p>


      </div>

    );


  }








  const cards = [


    {
      title:"Total Students",
      value:stats.totalStudents,
      icon:<FaUsers size={30}/>,
      style:"from-green-600 to-green-800",
    },



    {
      title:"Active Students",
      value:stats.activeStudents,
      icon:<FaUserCheck size={30}/>,
      style:"from-emerald-500 to-emerald-700",
    },



    {
      title:"Archived Students",
      value:stats.inactiveStudents,
      icon:<FaArchive size={30}/>,
      style:"from-red-600 to-red-800",
    },



    {
      title:"Male Students",
      value:stats.maleStudents,
      icon:<FaMale size={30}/>,
      style:"from-blue-600 to-blue-800",
    },



    {
      title:"Female Students",
      value:stats.femaleStudents,
      icon:<FaFemale size={30}/>,
      style:"from-pink-600 to-pink-800",
    },


  ];







  const genderData = [


    {
      name:"Male",
      value:stats.maleStudents,
    },


    {
      name:"Female",
      value:stats.femaleStudents,
    },


  ];







  const statusData = [


    {
      name:"Active",
      value:stats.activeStudents,
    },


    {
      name:"Archived",
      value:stats.inactiveStudents,
    },


  ];






  const COLORS = [

    "#16a34a",

    "#dc2626",

  ];







  return (


    <div
      className="
        min-h-screen
        bg-slate-950
        p-6
        rounded-xl
      "
    >



      <div className="mb-8">


        <h1
          className="
            text-3xl
            font-bold
            text-white
          "
        >

          Dashboard Overview

        </h1>



        <p
          className="
            text-gray-400
            mt-2
          "
        >

          Monitor your school activities and student records.

        </p>


      </div>







      {/* Statistic Cards */}


      <div
        className="
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-5
          gap-5
        "
      >



        {
          cards.map(card => (


            <div

              key={card.title}

              className={`
                bg-linear-to-br
                ${card.style}
                rounded-2xl
                p-6
                text-white
                shadow-xl
                hover:-translate-y-1
                transition
              `}

            >


              <div
                className="
                  flex
                  justify-between
                  items-center
                "
              >


                <div>


                  <p
                    className="
                      text-sm
                      opacity-90
                    "
                  >

                    {card.title}

                  </p>



                  <h2
                    className="
                      text-4xl
                      font-bold
                      mt-3
                    "
                  >

                    {card.value}

                  </h2>


                </div>




                <div
                  className="
                    opacity-80
                  "
                >

                  {card.icon}

                </div>



              </div>



            </div>


          ))
        }



      </div>
      



      {/* Charts */}



      <div
        className="
          grid
          md:grid-cols-2
          gap-6
          mt-8
        "
      >





        {/* Gender Chart */}


        <ChartCard title="Gender Distribution">


          <PieChart>


            <Pie

              data={genderData}

              dataKey="value"

              nameKey="name"

              outerRadius={100}

              label

            >


              {
                genderData.map(
                  (_, index) => (


                    <Cell

                      key={index}

                      fill={COLORS[index]}

                    />


                  )
                )
              }


            </Pie>



            <Tooltip />

            <Legend />



          </PieChart>



        </ChartCard>









        {/* Status Chart */}



        <ChartCard title="Student Status">


          <PieChart>


            <Pie

              data={statusData}

              dataKey="value"

              nameKey="name"

              outerRadius={100}

              label

            >



              <Cell fill="#22c55e" />


              <Cell fill="#ef4444" />



            </Pie>



            <Tooltip />


            <Legend />



          </PieChart>



        </ChartCard>







        {/* Monthly Registration Analytics */}




        <div
          className="
            md:col-span-2
          "
        >


          <ChartCard
            title={
              `Monthly Registration Analytics (${analyticsYear})`
            }
          >



            <BarChart

              data={monthlyRegistration}

            >



              <CartesianGrid />



              <XAxis

                dataKey="month"

              />



              <YAxis />



              <Tooltip />



              <Legend />




              <Bar

                dataKey="count"

                name="Registered Students"

                fill="#16a34a"

                radius={[
                  8,
                  8,
                  0,
                  0
                ]}

              />



            </BarChart>



          </ChartCard>



        </div>




      </div>

      {/* Recent Students */}

            <div
        className="
          mt-8
          bg-white/10
          backdrop-blur
          border
          border-white/10
          rounded-2xl
          p-6
        "
      >


        <h2
          className="
            text-xl
            font-bold
            text-white
            mb-5
          "
        >

          Recent Students

        </h2>





        <div
          className="
            overflow-x-auto
          "
        >


          <table
            className="
              w-full
              text-white
            "
          >



            <thead>


              <tr
                className="
                  border-b
                  border-white/20
                  text-gray-300
                "
              >


                <th
                  className="
                    p-3
                    text-left
                  "
                >
                  Student ID
                </th>



                <th
                  className="
                    p-3
                    text-left
                  "
                >
                  Name
                </th>



                <th
                  className="
                    p-3
                    text-left
                  "
                >
                  Class
                </th>



              </tr>


            </thead>






            <tbody>


              {
                stats.recentStudents.map(student => (


                  <tr

                    key={student.studentId}

                    className="
                      border-b
                      border-white/10
                      hover:bg-white/10
                      transition
                    "

                  >



                    <td
                      className="p-3"
                    >

                      {student.studentId}

                    </td>




                    <td
                      className="p-3"
                    >

                      {student.firstName}

                      {" "}

                      {student.lastName}

                    </td>





                    <td
                      className="p-3"
                    >

                      {student.currentClass}

                    </td>




                  </tr>


                ))
              }



            </tbody>



          </table>



        </div>



      </div>




    </div>


  );


}









function ChartCard({
  title,
  children
}) {



  return (


    <div
      className="
        bg-white/10
        backdrop-blur
        border
        border-white/10
        rounded-2xl
        p-6
        text-white
      "
    >



      <h2
        className="
          text-xl
          font-bold
          mb-5
        "
      >

        {title}

      </h2>




      <ResponsiveContainer

        width="100%"

        height={300}

      >


        {children}


      </ResponsiveContainer>




    </div>


  );


}






export default Dashboard;