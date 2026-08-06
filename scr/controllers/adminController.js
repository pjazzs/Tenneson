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


 if(!admin){

   return res.status(404).json({

     success:false,

     message:"Admin not found"

   });

 }



 await createAuditLog({

   user:req.user._id,

   action:"UPDATE_PERMISSION",

   module:"ADMIN",

   description:
   `${req.user.fullName} updated permissions for ${admin.fullName}`,

   req,

 });



 res.json({

   success:true,

   message:"Permissions updated successfully",

   admin

 });


});