const AuditLog = require("../models/AuditLog");


const createAuditLog = async ({
  user,
  action,
  module,
  description,
  req,
}) => {


try{


await AuditLog.create({

user,

action,

module,

description,

ipAddress:
req?.ip || "unknown",

});


}catch(error){


console.log(
"Audit log error:",
error.message
);


}


};


module.exports = createAuditLog;