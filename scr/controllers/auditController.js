const AuditLog = require("../models/AuditLog");



exports.getAuditLogs = async(req,res)=>{

try{


const logs = await AuditLog
.find()
.populate(
"user",
"fullName email role"
)
.sort({
createdAt:-1
})
.limit(100);



res.json({

success:true,

logs,

});


}catch(error){


res.status(500).json({

success:false,

message:error.message,

});


}


};