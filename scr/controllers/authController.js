const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const generateToken = require("../utils/generateToken");

exports.registerAdmin = async (req, res) => {
  try {

    const {
      fullName,
      email,
      password,
      role,
      permissions,
    } = req.body;


    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }


    const existingAdmin = await Admin.findOne({ email });


    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Admin already exists.",
      });
    }


    const hashedPassword = await bcrypt.hash(password, 12);


    const admin = await Admin.create({

      fullName,

      email: email.toLowerCase(),

      password: hashedPassword,

      role: role || "admin",

      permissions: permissions || [],

    });



    const token = jwt.sign(

      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },

      process.env.JWT_SECRET,

      {
        expiresIn: process.env.JWT_EXPIRES_IN,
      },

    );



    res.status(201).json({

      success: true,

      message: "Admin registered successfully.",

      token,

      admin: {

        id: admin._id,

        fullName: admin.fullName,

        email: admin.email,

        role: admin.role,

        permissions: admin.permissions,

      },

    });


  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find admin
    const admin = await Admin.findOne({
      email: email.toLowerCase(),
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(admin);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
