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
        message:"Permission denied."
      });

    }


    next();

  };

};


module.exports = {
  authorizePermission
};