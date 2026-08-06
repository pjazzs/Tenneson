const Admin = require("../models/admin");


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