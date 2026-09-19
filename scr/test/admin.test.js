const request = require("supertest");
const app = require("../app");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

describe("Admin Management API", () => {
  let superAdminToken;
  let adminToken;
  let targetAdmin;

  beforeEach(async () => {
    const password = await bcrypt.hash("Password123!", 10);

    // Create super admin
    const superAdmin = await Admin.create({
      fullName: "Super Admin",
      email: `superadmin${Date.now()}@test.com`,
      password,
      role: "super_admin",
      permissions: [],
    });

    // Create normal admin with management permissions
    const admin = await Admin.create({
      fullName: "Management Admin",
      email: `management${Date.now()}@test.com`,
      password,
      role: "admin",
      permissions: ["admins.manage", "admins.update", "admins.delete"],
    });

    // Create target admin
    targetAdmin = await Admin.create({
      fullName: "Target Admin",
      email: `target${Date.now()}@test.com`,
      password,
      role: "admin",
      permissions: [],
    });

    // Login super admin
    const superLogin = await request(app).post("/api/v1/auth/login").send({
      email: superAdmin.email,
      password: "Password123!",
    });

    expect(superLogin.statusCode).toBe(200);
    superAdminToken = superLogin.body.token;

    // Login management admin
    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: admin.email,
      password: "Password123!",
    });

    expect(adminLogin.statusCode).toBe(200);
    adminToken = adminLogin.body.token;
  });

  // =========================================================
  // GET ADMINS
  // =========================================================

  test("Should get all admins successfully", async () => {
    const response = await request(app)
      .get("/api/v1/admins")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.admins)).toBe(true);
    expect(response.body.count).toBeGreaterThan(0);

    const returnedAdmin = response.body.admins.find(
      (admin) => admin._id === targetAdmin._id.toString(),
    );

    expect(returnedAdmin).toBeDefined();
    expect(returnedAdmin.password).toBeUndefined();
  });

  test("Should reject getting admins without authentication", async () => {
    const response = await request(app).get("/api/v1/admins");

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("Should require admins.manage permission", async () => {
    const password = await bcrypt.hash("Password123!", 10);

    const noPermissionAdmin = await Admin.create({
      fullName: "No Management Permission",
      email: `nopermission${Date.now()}@test.com`,
      password,
      role: "admin",
      permissions: [],
    });

    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: noPermissionAdmin.email,
      password: "Password123!",
    });

    const token = loginResponse.body.token;

    const response = await request(app)
      .get("/api/v1/admins")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
  });

  // =========================================================
  // UPDATE PERMISSIONS
  // =========================================================

  test("Should update admin permissions successfully", async () => {
    const response = await request(app)
      .patch(`/api/v1/admins/${targetAdmin._id}/permissions`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        permissions: ["students.view", "students.create"],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.admin.permissions).toEqual([
      "students.view",
      "students.create",
    ]);

    const updatedAdmin = await Admin.findById(targetAdmin._id);

    expect(updatedAdmin.permissions).toEqual([
      "students.view",
      "students.create",
    ]);
  });

  test("Should reject invalid admin ID when updating permissions", async () => {
    const response = await request(app)
      .patch("/api/v1/admins/invalid-id/permissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        permissions: ["students.view"],
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid admin ID.");
  });

  test("Should reject permissions when they are not an array", async () => {
    const response = await request(app)
      .patch(`/api/v1/admins/${targetAdmin._id}/permissions`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        permissions: "students.view",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Permissions must be an array.");
  });

  test("Should return 404 when updating a non-existing admin", async () => {
    const fakeId = "507f1f77bcf86cd799439011";

    const response = await request(app)
      .patch(`/api/v1/admins/${fakeId}/permissions`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        permissions: ["students.view"],
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Admin not found.");
  });

  test("Should not allow modification of super admin permissions", async () => {
    const superAdmin = await Admin.findOne({
      role: "super_admin",
    });

    const response = await request(app)
      .patch(`/api/v1/admins/${superAdmin._id}/permissions`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        permissions: ["students.view"],
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Super admin permissions cannot be modified.",
    );
  });

  test("Should require admins.update permission", async () => {
    const password = await bcrypt.hash("Password123!", 10);

    const noUpdateAdmin = await Admin.create({
      fullName: "No Update Permission",
      email: `noupdate${Date.now()}@test.com`,
      password,
      role: "admin",
      permissions: [],
    });

    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: noUpdateAdmin.email,
      password: "Password123!",
    });

    const token = loginResponse.body.token;

    const response = await request(app)
      .patch(`/api/v1/admins/${targetAdmin._id}/permissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        permissions: ["students.view"],
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
  });

  // =========================================================
  // ADMIN JWT SECURITY
  // =========================================================

  test("Should reject a student token on an admin route", async () => {
    const studentLikeToken = jwt.sign(
      {
        id: targetAdmin._id.toString(),
        type: "student",
        tokenVersion: 0,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    const response = await request(app)
      .get("/api/v1/admins")
      .set("Authorization", `Bearer ${studentLikeToken}`);

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid admin authentication token.");
  });

  test("Should reject an admin token with an invalid token type", async () => {
    const invalidToken = jwt.sign(
      {
        id: targetAdmin._id.toString(),
        type: "something_else",
        tokenVersion: 0,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    const response = await request(app)
      .get("/api/v1/admins")
      .set("Authorization", `Bearer ${invalidToken}`);

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid admin authentication token.");
  });

  test("Should reject an admin token with an invalid token version", async () => {
    const admin = await Admin.findById(targetAdmin._id);

    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();

    const invalidatedToken = jwt.sign(
      {
        id: admin._id.toString(),
        type: "admin",
        tokenVersion: 0,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    const response = await request(app)
      .get("/api/v1/admins")
      .set("Authorization", `Bearer ${invalidatedToken}`);

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Admin authentication token is no longer valid.",
    );
  });

  test("Should accept a valid admin token", async () => {
    const decoded = jwt.decode(adminToken);

    expect(decoded).toBeDefined();
    expect(decoded.type).toBe("admin");
    expect(decoded.id).toBeDefined();
    expect(decoded.tokenVersion).toBe(0);

    const response = await request(app)
      .get("/api/v1/admins")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  // =========================================================
  // ADMIN PASSWORD CHANGE
  // =========================================================

  test("Should change admin password successfully", async () => {
    const response = await request(app)
      .patch("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Password changed successfully.");
    expect(response.body.token).toBeDefined();

    const admin = await Admin.findOne({
      email: { $regex: /^management/ },
    });

    expect(admin.tokenVersion).toBe(1);

    const passwordMatches = await bcrypt.compare(
      "NewPassword123!",
      admin.password,
    );

    expect(passwordMatches).toBe(true);
  });

  test("Should reject password change without authentication", async () => {
    const response = await request(app)
      .patch("/api/v1/auth/change-password")
      .send({
        currentPassword: "password123",
        newPassword: "NewPassword123!",
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("Should reject incorrect current password", async () => {
    const response = await request(app)
      .patch("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        currentPassword: "WrongPassword123!",
        newPassword: "NewPassword123!",
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Current password is incorrect.");
  });

  test("Should reject reusing the current password", async () => {
    const response = await request(app)
      .patch("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "Password123!",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "New password must be different from your current password.",
    );
  });

  test("Should reject weak admin password", async () => {
    const response = await request(app)
      .patch("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "weakpassword",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("Should invalidate the old admin token after password change", async () => {
    const oldToken = adminToken;

    const changeResponse = await request(app)
      .patch("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${oldToken}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
      });

    expect(changeResponse.statusCode).toBe(200);

    const response = await request(app)
      .get("/api/v1/admins")
      .set("Authorization", `Bearer ${oldToken}`);

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Admin authentication token is no longer valid.",
    );
  });

  test("Should accept the new admin token after password change", async () => {
    const changeResponse = await request(app)
      .patch("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
      });

    expect(changeResponse.statusCode).toBe(200);

    const newToken = changeResponse.body.token;

    const decoded = jwt.decode(newToken);

    expect(decoded).toBeDefined();
    expect(decoded.type).toBe("admin");
    expect(decoded.tokenVersion).toBe(1);

    const response = await request(app)
      .get("/api/v1/admins")
      .set("Authorization", `Bearer ${newToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  // =========================================================
  // DELETE ADMIN
  // =========================================================

  test("Should delete an admin successfully", async () => {
    const response = await request(app)
      .delete(`/api/v1/admins/${targetAdmin._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Admin deleted successfully.");

    const deletedAdmin = await Admin.findById(targetAdmin._id);

    expect(deletedAdmin).toBeNull();
  });

  test("Should reject invalid admin ID when deleting", async () => {
    const response = await request(app)
      .delete("/api/v1/admins/invalid-id")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid admin ID.");
  });

  test("Should return 404 when deleting a non-existing admin", async () => {
    const fakeId = "507f1f77bcf86cd799439011";

    const response = await request(app)
      .delete(`/api/v1/admins/${fakeId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Admin not found.");
  });

  test("Should not allow an admin to delete their own account", async () => {
    const managementAdmin = await Admin.findOne({
      email: { $regex: /^management/ },
    });

    const response = await request(app)
      .delete(`/api/v1/admins/${managementAdmin._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("You cannot delete your own account.");
  });

  test("Should not allow deletion of a super admin", async () => {
    const superAdmin = await Admin.findOne({
      role: "super_admin",
    });

    const response = await request(app)
      .delete(`/api/v1/admins/${superAdmin._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Super admin accounts cannot be deleted.",
    );
  });

  test("Should require admins.delete permission", async () => {
    const password = await bcrypt.hash("Password123!", 10);

    const noDeleteAdmin = await Admin.create({
      fullName: "No Delete Permission",
      email: `nodelete${Date.now()}@test.com`,
      password,
      role: "admin",
      permissions: [],
    });

    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: noDeleteAdmin.email,
      password: "Password123!",
    });

    const token = loginResponse.body.token;

    const response = await request(app)
      .delete(`/api/v1/admins/${targetAdmin._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
