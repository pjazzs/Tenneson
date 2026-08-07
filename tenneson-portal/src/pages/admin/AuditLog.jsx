import {
useEffect,
useState
} from "react";

import {
useNavigate
} from "react-router-dom";

import api from "../../api/axios";


function AuditLog(){

const navigate = useNavigate();

const [logs,setLogs]=useState([]);

const [loading,setLoading]=useState(true);



useEffect(()=>{


const fetchLogs=async()=>{

try{

const response=await api.get(
"/audit"
);


setLogs(
response.data.logs
);


}catch(error){

console.log(
error.response?.data || error.message
);


}finally{

setLoading(false);

}


};


fetchLogs();


},[]);





return (

<div className="
text-white
">


<div className="
flex
justify-between
items-center
mb-6
">


<div>

<h1 className="
text-3xl
font-bold
text-gray-900
">

Audit Logs

</h1>


<p className="
text-gray-600
mt-2
">

Track important activities performed by administrators.

</p>


</div>



<button

onClick={() =>
navigate("/dashboard")
}

className="
bg-slate-800
hover:bg-slate-700
px-5
py-2
rounded-xl
text-sm
transition
"

>

← Back to Dashboard

</button>


</div>



<div className="
bg-slate-900
rounded-2xl
border
border-white/10
overflow-hidden
">


<table className="w-full">


<thead>

<tr className="
border-b
border-white/10
text-gray-400
">


<th className="p-4 text-left">
User
</th>


<th className="p-4 text-left">
Action
</th>


<th className="p-4 text-left">
Module
</th>


<th className="p-4 text-left">
Description
</th>


<th className="p-4 text-left">
Date
</th>


</tr>

</thead>



<tbody>


{
loading ? (

<tr>

<td
colSpan="5"
className="
text-center
p-10
"
>

Loading logs...

</td>

</tr>


)

:

logs.map(log=>(


<tr
key={log._id}
className="
border-b
border-white/10
hover:bg-white/5
"
>


<td className="p-4">

{log.user?.fullName || "System"}

</td>


<td className="p-4">

<span className="
bg-blue-500/20
text-blue-400
px-3
py-1
rounded-full
text-sm
">

{log.action}

</span>

</td>


<td className="p-4">

{log.module}

</td>


<td className="p-4 text-gray-300">

{log.description}

</td>


<td className="p-4 text-gray-400">

{
new Date(
log.createdAt
).toLocaleString()
}

</td>


</tr>


))


}


</tbody>


</table>


</div>


</div>

);


}


export default AuditLog;