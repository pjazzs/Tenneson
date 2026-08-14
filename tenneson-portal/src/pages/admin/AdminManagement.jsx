import { useEffect, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

import {
  FaUserShield,
  FaTimes,
  FaPlus,
  FaArrowLeft,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

function AdminManagement() {
  const navigate = useNavigate();

  const { admin } = useAuth();

  /*
  =========================================
  CURRENT ADMIN
  =========================================
  */

  const isSuperAdmin = admin?.role === "super_admin";

  const hasPermission = (permission) => {
    if (isSuperAdmin) {
      return true;
    }

    return (
      Array.isArray(admin?.permissions) &&
      admin.permissions.includes(permission)
    );
  };

  /*
  =========================================
  ADMIN PERMISSIONS
  =========================================
  */

  const canManageAdmins = hasPermission("admins.manage");
  const canCreateAdmins = hasPermission("admins.create");
  const canUpdateAdmins = hasPermission("admins.update");
  const canDeleteAdmins = hasPermission("admins.delete");

  /*
  =========================================
  STATE
  =========================================
  */

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showPermissionModal, setShowPermissionModal] =
    useState(false);

  const [admins, setAdmins] = useState([]);

  const [loading, setLoading] = useState(true);

  const [selectedAdmin, setSelectedAdmin] = useState(null);

  const [permissions, setPermissions] = useState([]);

  const [newAdmin, setNewAdmin] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "admin",
  });

  /*
  =========================================
  AVAILABLE PERMISSIONS
  =========================================
  */

  const permissionGroups = {
    Students: [
      {
        key: "students.view",
        label: "View Students",
      },

      {
        key: "students.create",
        label: "Create Student",
      },

      {
        key: "students.update",
        label: "Update Student",
      },

      {
        key: "students.delete",
        label: "Delete Student",
      },

      {
        key: "students.export",
        label: "Export Students",
      },

      {
        key: "students.photo",
        label: "Upload Student Photo",
      },

      {
        key: "students.import",
        label: "Import Students",
      },
    ],

    Admins: [
      {
        key: "admins.manage",
        label: "Manage Admins",
      },

      {
        key: "admins.create",
        label: "Create Admin",
      },

      {
        key: "admins.update",
        label: "Update Admin Permissions",
      },

      {
        key: "admins.delete",
        label: "Delete Admin",
      },
    ],
  };

  const allPermissions = Object.values(permissionGroups)
    .flat()
    .map((permission) => permission.key);

  /*
  =========================================
  FETCH ADMINS
  =========================================
  */

  useEffect(() => {
    const fetchAdmins = async () => {
      if (!canManageAdmins) {
        setAdmins([]);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/admins");

        setAdmins(response.data.admins || []);
      } catch (error) {
        console.log(
          "Admin fetch error:",
          error.response?.data || error.message
        );

        setAdmins([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, [canManageAdmins]);

  /*
  =========================================
  CREATE ADMIN
  =========================================
  */

  const createAdmin = async () => {
    if (!canCreateAdmins) {
      console.log(
        "You do not have permission to create admins."
      );

      return;
    }

    if (
      !newAdmin.fullName.trim() ||
      !newAdmin.email.trim() ||
      !newAdmin.password.trim()
    ) {
      console.log(
        "Full name, email and password are required."
      );

      return;
    }

    try {
      const response = await api.post(
        "/auth/register",
        newAdmin
      );

      /*
      =========================================
      UPDATE TABLE ONLY IF ADMIN MANAGEMENT
      IS AVAILABLE
      =========================================
      */

      if (response.data.admin) {
        setAdmins((prev) => [
          response.data.admin,
          ...prev,
        ]);
      }

      setShowCreateModal(false);

      setNewAdmin({
        fullName: "",
        email: "",
        password: "",
        role: "admin",
      });
    } catch (error) {
      console.log(
        "Create admin error:",
        error.response?.data || error.message
      );
    }
  };

  /*
  =========================================
  DELETE ADMIN
  =========================================
  */

  const deleteAdmin = async (adminId) => {
    /*
    =========================================
    FRONTEND PERMISSION CHECK
    =========================================
    */

    if (!canDeleteAdmins) {
      console.log(
        "You do not have permission to delete admins."
      );

      return;
    }

    /*
    =========================================
    PREVENT INVALID REQUEST
    =========================================
    */

    if (!adminId) {
      console.error(
        "Cannot delete admin: missing admin ID."
      );

      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this admin?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await api.delete(`/admins/${adminId}`);

      setAdmins((prev) =>
        prev.filter(
          (adminItem) =>
            adminItem._id !== adminId
        )
      );
    } catch (error) {
      console.log(
        "Delete admin error:",
        error.response?.data || error.message
      );
    }
  };

  /*
  =========================================
  OPEN PERMISSION MODAL
  =========================================
  */

  const openPermissionModal = (adminToEdit) => {
    if (!canUpdateAdmins) {
      console.log(
        "You do not have permission to update admin permissions."
      );

      return;
    }

    if (!adminToEdit?._id) {
      console.error(
        "Cannot manage admin: missing admin ID."
      );

      return;
    }

    if (adminToEdit.role === "super_admin") {
      return;
    }

    setSelectedAdmin(adminToEdit);

    setPermissions(
      Array.isArray(adminToEdit.permissions)
        ? adminToEdit.permissions
        : []
    );

    setShowPermissionModal(true);
  };

  /*
  =========================================
  TOGGLE SINGLE PERMISSION
  =========================================
  */

  const togglePermission = (permission) => {
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter(
            (item) => item !== permission
          )
        : [...prev, permission]
    );
  };

  /*
  =========================================
  TOGGLE ALL PERMISSIONS
  =========================================
  */

  const toggleAllPermissions = () => {
    if (
      permissions.length ===
      allPermissions.length
    ) {
      setPermissions([]);
    } else {
      setPermissions([...allPermissions]);
    }
  };

  /*
  =========================================
  TOGGLE GROUP PERMISSIONS
  =========================================
  */

  const toggleGroupPermissions = (group) => {
    const groupPermissions =
      permissionGroups[group].map(
        (permission) => permission.key
      );

    const hasAll = groupPermissions.every(
      (permission) =>
        permissions.includes(permission)
    );

    if (hasAll) {
      setPermissions((prev) =>
        prev.filter(
          (item) =>
            !groupPermissions.includes(item)
        )
      );
    } else {
      setPermissions((prev) => [
        ...new Set([
          ...prev,
          ...groupPermissions,
        ]),
      ]);
    }
  };

  /*
  =========================================
  SAVE PERMISSIONS
  =========================================
  */

  const savePermissions = async () => {
    if (!canUpdateAdmins) {
      console.log(
        "You do not have permission to update admin permissions."
      );

      return;
    }

    if (!selectedAdmin?._id) {
      console.error(
        "Cannot update permissions: missing admin ID."
      );

      return;
    }

    try {
      await api.patch(
        `/admins/${selectedAdmin._id}/permissions`,
        {
          permissions,
        }
      );

      setAdmins((prev) =>
        prev.map((adminItem) =>
          adminItem._id === selectedAdmin._id
            ? {
                ...adminItem,
                permissions,
              }
            : adminItem
        )
      );

      setShowPermissionModal(false);
      setSelectedAdmin(null);
      setPermissions([]);
    } catch (error) {
      console.log(
        "Permission update error:",
        error.response?.data || error.message
      );
    }
  };

  /*
  =========================================
  CLOSE PERMISSION MODAL
  =========================================
  */

  const closePermissionModal = () => {
    setShowPermissionModal(false);
    setSelectedAdmin(null);
    setPermissions([]);
  };

  /*
  =========================================
  LOADING
  =========================================
  */

  if (loading) {
    return (
      <div
        className="
          flex
          justify-center
          items-center
          h-60
          text-gray-700
        "
      >
        Loading admins...
      </div>
    );
  }

  /*
  =========================================
  ACCESS DENIED
  =========================================
  */

  if (!canManageAdmins) {
    return (
      <div
        className="
          min-h-[70vh]
          flex
          items-center
          justify-center
          p-6
        "
      >
        <div
          className="
            bg-slate-900
            border
            border-red-500/20
            rounded-2xl
            p-8
            max-w-md
            w-full
            text-center
          "
        >
          <FaUserShield
            className="
              text-red-400
              text-5xl
              mx-auto
              mb-5
            "
          />

          <h1
            className="
              text-2xl
              font-bold
              text-white
              mb-3
            "
          >
            Access Denied
          </h1>

          <p
            className="
              text-gray-400
              mb-6
            "
          >
            You do not have permission to
            manage administrators.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/dashboard")
            }
            className="
              bg-green-600
              hover:bg-green-700
              px-5
              py-3
              rounded-xl
              text-white
              font-semibold
              transition
            "
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /*
  =========================================
  MAIN UI
  =========================================
  */

  return (
    <div
      className="
        min-h-screen
        bg-slate-950
        p-6
        text-white
      "
    >
      {/* =========================================
          HEADER
      ========================================= */}

      <div
        className="
          mb-8
          flex
          justify-between
          items-center
          flex-wrap
          gap-4
        "
      >
        <div>
          <h1
            className="
              text-3xl
              font-bold
              flex
              items-center
              gap-3
            "
          >
            <FaUserShield />

            Admin Management
          </h1>

          <p
            className="
              text-gray-400
              mt-2
            "
          >
            Manage administrators and their
            permissions.
          </p>
        </div>

        <div
          className="
            flex
            gap-3
            flex-wrap
          "
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              bg-gray-600
              hover:bg-gray-700
              px-5
              py-3
              rounded-xl
              flex
              items-center
              gap-2
              transition
            "
          >
            <FaArrowLeft />

            Back
          </button>

          {/* =========================================
              CREATE ADMIN

              This now correctly checks admins.create
              instead of only allowing super_admin.
          ========================================= */}

          {canCreateAdmins && (
            <button
              type="button"
              onClick={() =>
                setShowCreateModal(true)
              }
              className="
                bg-green-600
                hover:bg-green-700
                px-5
                py-3
                rounded-xl
                flex
                items-center
                gap-2
                transition
              "
            >
              <FaPlus />

              Add Admin
            </button>
          )}
        </div>
      </div>

      {/* =========================================
          ADMIN TABLE
      ========================================= */}

      <div
        className="
          bg-white/10
          border
          border-white/10
          rounded-2xl
          overflow-hidden
        "
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                className="
                  border-b
                  border-white/10
                  text-gray-300
                "
              >
                <th className="p-4 text-left">
                  Name
                </th>

                <th className="p-4 text-left">
                  Email
                </th>

                <th className="p-4 text-left">
                  Role
                </th>

                <th className="p-4 text-left">
                  Permissions
                </th>

                <th className="p-4 text-left">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="
                      p-10
                      text-center
                      text-gray-400
                    "
                  >
                    No administrators found.
                  </td>
                </tr>
              ) : (
                admins.map((adminItem) => (
                  <tr
                    key={adminItem._id}
                    className="
                      border-b
                      border-white/10
                      hover:bg-white/5
                    "
                  >
                    <td className="p-4">
                      {adminItem.fullName}
                    </td>

                    <td className="p-4">
                      {adminItem.email}
                    </td>

                    <td className="p-4">
                      <span
                        className="
                          px-3
                          py-1
                          rounded-full
                          bg-green-600/20
                          text-green-400
                          text-sm
                        "
                      >
                        {adminItem.role}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className="
                          bg-blue-600/20
                          text-blue-400
                          px-3
                          py-1
                          rounded-full
                          text-sm
                        "
                      >
                        {adminItem.permissions
                          ?.length || 0}{" "}
                        permissions
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        {/* =========================================
                            MANAGE PERMISSIONS
                        ========================================= */}

                        {canUpdateAdmins &&
                          adminItem.role !==
                            "super_admin" && (
                            <button
                              type="button"
                              onClick={() =>
                                openPermissionModal(
                                  adminItem
                                )
                              }
                              className="
                                flex
                                items-center
                                gap-2
                                bg-purple-600
                                hover:bg-purple-700
                                px-4
                                py-2
                                rounded-xl
                                transition
                              "
                            >
                              <FaUserShield />

                              Manage
                            </button>
                          )}

                        {/* =========================================
                            DELETE ADMIN
                        ========================================= */}

                        {canDeleteAdmins &&
                          adminItem.role !==
                            "super_admin" && (
                            <button
                              type="button"
                              onClick={() =>
                                deleteAdmin(
                                  adminItem._id
                                )
                              }
                              className="
                                bg-red-600
                                hover:bg-red-700
                                px-4
                                py-2
                                rounded-xl
                                transition
                              "
                            >
                              Delete
                            </button>
                          )}

                        {/* =========================================
                            NO ACTIONS AVAILABLE
                        ========================================= */}

                        {!canUpdateAdmins &&
                          !canDeleteAdmins && (
                            <span
                              className="
                                text-gray-500
                                text-sm
                              "
                            >
                              No actions
                            </span>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================
          CREATE ADMIN MODAL
      ========================================= */}

      {showCreateModal && (
        <div
          className="
            fixed
            inset-0
            bg-black/60
            flex
            items-center
            justify-center
            z-50
            p-4
          "
        >
          <div
            className="
              bg-slate-900
              border
              border-white/10
              rounded-2xl
              p-6
              w-full
              max-w-md
            "
          >
            <div
              className="
                flex
                justify-between
                items-center
                mb-6
              "
            >
              <h2 className="text-xl font-bold">
                Create Admin
              </h2>

              <button
                type="button"
                aria-label="Close create admin modal"
                onClick={() =>
                  setShowCreateModal(false)
                }
                className="
                  text-gray-400
                  hover:text-white
                  transition
                "
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <input
                id="full-name"
                name="fullName"
                placeholder="Full Name"
                type="text"
                autoComplete="name"
                value={newAdmin.fullName}
                onChange={(e) =>
                  setNewAdmin({
                    ...newAdmin,
                    fullName: e.target.value,
                  })
                }
                className="
                  w-full
                  bg-slate-800
                  border
                  border-white/10
                  rounded-xl
                  px-4
                  py-3
                  text-white
                  focus:outline-none
                  focus:border-green-500
                "
              />

              <input
                id="admin-email"
                name="email"
                placeholder="Email"
                type="email"
                autoComplete="email"
                value={newAdmin.email}
                onChange={(e) =>
                  setNewAdmin({
                    ...newAdmin,
                    email: e.target.value,
                  })
                }
                className="
                  w-full
                  bg-slate-800
                  border
                  border-white/10
                  rounded-xl
                  px-4
                  py-3
                  text-white
                  focus:outline-none
                  focus:border-green-500
                "
              />

              <input
                id="admin-password"
                name="password"
                placeholder="Password"
                type="password"
                autoComplete="new-password"
                value={newAdmin.password}
                onChange={(e) =>
                  setNewAdmin({
                    ...newAdmin,
                    password: e.target.value,
                  })
                }
                className="
                  w-full
                  bg-slate-800
                  border
                  border-white/10
                  rounded-xl
                  px-4
                  py-3
                  text-white
                  focus:outline-none
                  focus:border-green-500
                "
              />

              <select
                id="admin-role"
                name="role"
                value={newAdmin.role}
                onChange={(e) =>
                  setNewAdmin({
                    ...newAdmin,
                    role: e.target.value,
                  })
                }
                className="
                  w-full
                  bg-slate-800
                  border
                  border-white/10
                  rounded-xl
                  px-4
                  py-3
                  text-white
                  focus:outline-none
                  focus:border-green-500
                "
              >
                <option value="admin">
                  Admin
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={createAdmin}
              className="
                mt-6
                w-full
                bg-green-600
                hover:bg-green-700
                py-3
                rounded-xl
                font-semibold
                transition
              "
            >
              Create Admin
            </button>
          </div>
        </div>
      )}

      {/* =========================================
          PERMISSION MODAL
      ========================================= */}

      {showPermissionModal && (
        <div
          className="
            fixed
            inset-0
            bg-black/60
            flex
            items-center
            justify-center
            z-50
            p-4
          "
        >
          <div
            className="
              bg-slate-900
              border
              border-white/10
              rounded-2xl
              p-6
              w-full
              max-w-lg
              max-h-[90vh]
              overflow-y-auto
            "
          >
            <div
              className="
                flex
                justify-between
                items-center
                mb-6
              "
            >
              <div>
                <h2 className="text-xl font-bold">
                  Manage Permissions
                </h2>

                <p
                  className="
                    text-gray-400
                    text-sm
                    mt-1
                  "
                >
                  {selectedAdmin?.fullName}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close permissions modal"
                onClick={
                  closePermissionModal
                }
                className="
                  text-gray-400
                  hover:text-white
                  transition
                "
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-5">
              {/* =========================================
                  SELECT ALL
              ========================================= */}

              <label
                htmlFor="select-all-permissions"
                className="
                  flex
                  items-center
                  gap-3
                  bg-green-600/20
                  p-3
                  rounded-lg
                  cursor-pointer
                "
              >
                <input
                  id="select-all-permissions"
                  name="selectAllPermissions"
                  type="checkbox"
                  checked={
                    permissions.length ===
                    allPermissions.length
                  }
                  onChange={
                    toggleAllPermissions
                  }
                />

                <span className="font-semibold">
                  Select All Permissions
                </span>
              </label>

              {/* =========================================
                  PERMISSION GROUPS
              ========================================= */}

              {Object.keys(
                permissionGroups
              ).map((group) => (
                <div
                  key={group}
                  className="
                    bg-white/5
                    rounded-xl
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      justify-between
                      items-center
                      mb-3
                    "
                  >
                    <h3
                      className="
                        font-bold
                        text-green-400
                      "
                    >
                      {group}
                    </h3>

                    <label
                      htmlFor={`select-${group}`}
                      className="
                        text-sm
                        flex
                        items-center
                        gap-2
                        cursor-pointer
                      "
                    >
                      <input
                        id={`select-${group}`}
                        name={`select-${group}`}
                        type="checkbox"
                        checked={permissionGroups[
                          group
                        ].every((item) =>
                          permissions.includes(
                            item.key
                          )
                        )}
                        onChange={() =>
                          toggleGroupPermissions(
                            group
                          )
                        }
                      />

                      Select All
                    </label>
                  </div>

                  <div className="space-y-2">
                    {permissionGroups[
                      group
                    ].map((permission) => (
                      <label
                        key={permission.key}
                        htmlFor={`permission-${permission.key}`}
                        className="
                          flex
                          items-center
                          gap-3
                          bg-slate-800
                          p-3
                          rounded-lg
                          cursor-pointer
                        "
                      >
                        <input
                          id={`permission-${permission.key}`}
                          name={`permission-${permission.key}`}
                          type="checkbox"
                          checked={permissions.includes(
                            permission.key
                          )}
                          onChange={() =>
                            togglePermission(
                              permission.key
                            )
                          }
                        />

                        <span>
                          {permission.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={savePermissions}
              className="
                mt-6
                w-full
                bg-green-600
                hover:bg-green-700
                py-3
                rounded-xl
                font-semibold
                transition
              "
            >
              Save Permissions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminManagement;