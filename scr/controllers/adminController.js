const Admin = require("../models/Admin");
const asyncHandler = require("express-async-handler");


// ===============================
// Get All Admins
// ===============================

exports.getAdmins = async (req, res) => {

  try {


    const admins = await Admin.find()

      .select("-password")

      .sort({
        createdAt: -1,
      });



    res.status(200).json({

      success:true,

      count:admins.length,

      admins,

    });



  } catch(error) {


    res.status(500).json({

      success:false,

      message:error.message,

    });


  }

};

exports.updatePermissions = asyncHandler(async(req,res)=>{

 const admin = await Admin.findByIdAndUpdate(
   req.params.id,
   {
     permissions:req.body.permissions
   },
   {
     new:true
   }
 );


 res.json({
   success:true,
   message:"Permissions updated successfully",
   admin
 });


});