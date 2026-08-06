const mongoose = require("mongoose");


const auditLogSchema = new mongoose.Schema(

{
  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Admin",
  },


  action:{
    type:String,
    required:true,
  },


  module:{
    type:String,
    required:true,
  },


  description:{
    type:String,
    required:true,
  },


  ipAddress:{
    type:String,
  },


},

{
  timestamps:true,
}

);


module.exports = mongoose.model(
  "AuditLog",
  auditLogSchema
);