const authorizePermission = (permission) => {

  return (req,res,next)=>{


    if(
      req.admin.role === "super_admin"
    ){
      return next();
    }


    if(
      !req.admin.permissions.includes(permission)
    ){

      return res.status(403).json({
        success:false,
        message:"You do not have permission to perform this action."
      });

    }


    next();

  };

};


module.exports = {
  authorizePermission
};