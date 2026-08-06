import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  FaPlus,
  FaEye,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

import api from "../../api/axios";



function Students() {


  const navigate = useNavigate();



  const [students,setStudents] = useState([]);

  const [pagination,setPagination] = useState(null);

  const [loading,setLoading] = useState(true);

  const [page,setPage] = useState(1);



  const [search,setSearch] = useState("");

  const [searchInput,setSearchInput] = useState("");



  const [classFilter,setClassFilter] = useState("");

  const [genderFilter,setGenderFilter] = useState("");

  const [sessionFilter,setSessionFilter] = useState("");

  const [statusFilter,setStatusFilter] = useState("");






  // Debounce search

  useEffect(()=>{


    const timer = setTimeout(()=>{


      setSearch(searchInput);

      setPage(1);


    },500);



    return ()=>clearTimeout(timer);


  },[searchInput]);







  // Fetch students


  useEffect(()=>{


    const fetchStudents = async()=>{


      try{


        setLoading(true);



        const response = await api.get(
          "/students",
          {
            params:{
              page,
              limit:10,
              search,
              class:classFilter,
              gender:genderFilter,
              session:sessionFilter,
              status:statusFilter
            }
          }
        );



        setStudents(
          response.data.students
        );



        setPagination(
          response.data.pagination
        );



      }catch(error){


        console.log(
          "Students error:",
          error.response?.data || error.message
        );


      }finally{


        setLoading(false);


      }


    };



    fetchStudents();


  },[
    page,
    search,
    classFilter,
    genderFilter,
    sessionFilter,
    statusFilter
  ]);








return (

<div className="text-white">



{/* HEADER */}


<div
className="
flex
justify-between
items-center
flex-wrap
gap-4
mb-8
"
>


<div>

<h1
className="
text-3xl
font-bold
text-white
"
>
Students
</h1>


<p
className="
text-gray-400
"
>
Manage registered students
</p>


</div>




<button

onClick={()=>navigate("/students/add")}

className="
flex
items-center
gap-2
bg-green-600
hover:bg-green-700
px-5
py-3
rounded-xl
shadow-lg
transition
"

>

<FaPlus/>

Add Student

</button>


</div>







{/* FILTER AREA */}


<div
className="
grid
grid-cols-1
md:grid-cols-5
gap-3
mb-6
"
>





{/* Search */}

<div
className="
relative
md:col-span-2
"
>


<FaSearch

className="
absolute
left-4
top-1/2
-transform
-y-1/2
text-gray-400
"
/>


<input

type="text"

placeholder="Search name or student ID..."

value={searchInput}

onChange={(e)=>
setSearchInput(e.target.value)
}


className="
w-full
bg-slate-800
border
border-white/10
rounded-xl
py-3
pl-12
pr-4
text-white
placeholder-gray-400
outline-none
"

/>


</div>






{/* Class */}

<select

value={classFilter}

onChange={(e)=>{

setClassFilter(e.target.value);

setPage(1);

}}

className="
bg-slate-800
border
border-white/10
rounded-xl
px-4
text-white
"

>


<option value="">
All Classes
</option>


<option value="JSS1">
JSS1
</option>


<option value="JSS2">
JSS2
</option>


<option value="JSS3">
JSS3
</option>


<option value="SS1">
SS1
</option>


<option value="SS2">
SS2
</option>


<option value="SS3">
SS3
</option>


</select>







{/* Gender */}


<select

value={genderFilter}

onChange={(e)=>{

setGenderFilter(e.target.value);

setPage(1);

}}

className="
bg-slate-800
border
border-white/10
rounded-xl
px-4
text-white
"

>


<option value="">
All Gender
</option>


<option value="Male">
Male
</option>


<option value="Female">
Female
</option>


</select>






{/* Status */}


<select

value={statusFilter}

onChange={(e)=>{

setStatusFilter(e.target.value);

setPage(1);

}}

className="
bg-slate-800
border
border-white/10
rounded-xl
px-4
text-white
"

>


<option value="">
All Status
</option>


<option value="active">
Active
</option>


<option value="archived">
Archived
</option>


</select>



</div>


{/* TABLE */}


<div
className="
bg-slate-900
border
border-white/10
rounded-2xl
shadow-xl
overflow-hidden
"
>


<table
className="
w-full
text-xs
table-fixed
"
>



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
px-2
py-3
text-left
w-[25%]
"
>
Student
</th>



<th
className="
px-2
py-3
text-left
w-[15%]
"
>
ID
</th>




<th
className="
px-2
py-3
text-left
w-[12%]
"
>
Gender
</th>


{/* Session */}

<select

  value={sessionFilter}

  onChange={(e)=>{

    setSessionFilter(e.target.value);

    setPage(1);

  }}

  className="
    bg-slate-800
    border
    border-white/10
    rounded-xl
    px-4
    text-white
  "

>

  <option value="">
    All Sessions
  </option>


  <option value="2025/2026">
    2025/2026
  </option>


  <option value="2026/2027">
    2026/2027
  </option>


</select>

<th
className="
px-2
py-3
text-left
w-[12%]
"
>
Class
</th>




<th
className="
px-2
py-3
text-left
w-[15%]
"
>
Session
</th>




<th
className="
px-2
py-3
text-left
w-[10%]
"
>
Status
</th>




<th
className="
px-2
py-3
text-left
w-[11%]
"
>
Action
</th>


</tr>


</thead>






<tbody>



{

loading ? (


<tr>

<td
colSpan="7"
className="
text-center
py-10
text-gray-400
"
>

Loading students...

</td>

</tr>



)

:

students.length === 0 ? (


<tr>

<td
colSpan="7"
className="
text-center
py-10
text-gray-400
"
>

No students found

</td>

</tr>



)


:


students.map((student)=>(


<tr

key={student.studentId}

className="
border-b
border-white/10
hover:bg-white/5
transition
"

>




<td
className="
px-2
py-3
"
>


<div
className="
flex
items-center
gap-2
"
>


{


student.photo?.url ? (


<img

src={student.photo.url}

alt="student"

className="
w-7
h-7
rounded-full
object-cover
"

/>


)


:


(


<div

className="
w-7
h-7
rounded-full
bg-green-600
flex
items-center
justify-center
text-[10px]
font-bold
"

>

{student.firstName?.[0]}

{student.lastName?.[0]}


</div>


)


}





<span

className="
text-gray-200
truncate
"

>

{student.firstName} {student.lastName}

</span>


</div>


</td>







<td

className="
px-2
py-3
text-gray-300
truncate
"

>

{student.studentId}

</td>






<td

className="
px-2
py-3
text-gray-300
"

>

{student.gender}

</td>






<td

className="
px-2
py-3
text-gray-300
"

>

{student.currentClass}

</td>






<td

className="
px-2
py-3
text-gray-300
"

>

{student.session}

</td>






<td

className="
px-2
py-3
"

>


<span

className={`
px-2
py-1
rounded-full
text-[10px]
font-medium

${
student.isActive

?

"bg-green-600/20 text-green-400"

:

"bg-red-600/20 text-red-400"

}

`}

>


{

student.isActive

?

"Active"

:

"Archived"

}


</span>


</td>








<td

className="
px-2
py-3
"

>


<button


onClick={()=>navigate(
`/students/${student.studentId}`
)}


className="
flex
items-center
gap-1
bg-blue-600
hover:bg-blue-700
px-2
py-1
rounded-lg
text-[11px]
"

>


<FaEye size={10}/>


View


</button>


</td>






</tr>



))


}



</tbody>



</table>


</div>

{/* PAGINATION */}


{
pagination && (


<div
className="
flex
justify-between
items-center
mt-6
"
>


<button


disabled={page === 1}


onClick={()=>
setPage(page - 1)
}


className="
flex
items-center
gap-2
bg-slate-800
hover:bg-slate-700
px-3
py-2
rounded-lg
text-sm
disabled:opacity-40
"

>

<FaChevronLeft/>

Previous


</button>





<p
className="
text-gray-400
text-sm
"
>

Page {pagination.currentPage} of {pagination.totalPages}

</p>







<button


disabled={
page === pagination.totalPages
}


onClick={()=>
setPage(page + 1)
}


className="
flex
items-center
gap-2
bg-green-600
hover:bg-green-700
px-3
py-2
rounded-lg
text-sm
disabled:opacity-40
"

>


Next


<FaChevronRight/>


</button>



</div>


)


}



</div>


);


}



export default Students;