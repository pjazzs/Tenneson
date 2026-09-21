const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
      console.log("[AUTH DEBUG] No token provided");

      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    console.log("[AUTH DEBUG] Token received");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("[AUTH DEBUG] Decoded token:", {
      id: decoded.id,
      type: decoded.type,
      tokenVersion: decoded.tokenVersion,
    });

    if (decoded.type !== "admin") {
      console.log("[AUTH DEBUG] Invalid token type:", decoded.type);

      return res.status(401).json({
        success: false,
        message: "Invalid admin authentication token.",
      });
    }

    if (!decoded.id) {
      console.log("[AUTH DEBUG] Token has no admin ID");

      return res.status(401).json({
        success: false,
        message: "Invalid admin authentication token.",
      });
    }

    const admin = await Admin.findById(decoded.id).select("-password");

    console.log("[AUTH DEBUG] Admin lookup:", {
      found: !!admin,
      adminId: decoded.id,
    });

    if (!admin) {
      console.log("[AUTH DEBUG] Admin no longer exists");

      return res.status(401).json({
        success: false,
        message: "Admin no longer exists.",
      });
    }

    if (!admin.isActive) {
      console.log("[AUTH DEBUG] Admin account is inactive");

      return res.status(401).json({
        success: false,
        message: "Admin account is inactive.",
      });
    }

    const currentTokenVersion = admin.tokenVersion || 0;
    const tokenVersion = decoded.tokenVersion ?? 0;

    console.log("[AUTH DEBUG] Token versions:", {
      tokenVersion,
      currentTokenVersion,
    });

    if (tokenVersion !== currentTokenVersion) {
      console.log("[AUTH DEBUG] Token version mismatch");

      return res.status(401).json({
        success: false,
        message: "Admin authentication token is no longer valid.",
      });
    }

    req.admin = admin;

    console.log("[AUTH DEBUG] Authentication successful:", {
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    });

    next();
  } catch (error) {
    console.error("[AUTH DEBUG] Authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};
