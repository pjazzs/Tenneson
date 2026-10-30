import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaSave, FaArrowLeft } from "react-icons/fa";
import api from "../../api/axios";

const JUNIOR_CLASSES = ["JSS1", "JSS2", "JSS3"];

const SENIOR_CLASSES = ["SS1", "SS2", "SS3"];

const ALL_CLASSES = [...JUNIOR_CLASSES, ...SENIOR_CLASSES];

function EditStudent() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    otherName: "",
    gender: "",
    dateOfBirth: "",
    currentClass: "",
    session: "",
    parentName: "",
    parentPhone: "",
    department: "",
  });

  const [departments, setDepartments] = useState([]);

  const [originalDepartment, setOriginalDepartment] = useState("");

  const [originalClass, setOriginalClass] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState("success");

  const isSeniorClass = SENIOR_CLASSES.includes(formData.currentClass);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentResponse, departmentResponse] = await Promise.all([
          api.get(`/students/${studentId}`),
          api.get("/departments"),
        ]);

        const student = studentResponse.data.student;

        const studentDepartmentId = student.department?._id
          ? String(student.department._id)
          : student.department
            ? String(student.department)
            : "";

        setDepartments(departmentResponse.data.departments || []);

        setOriginalDepartment(studentDepartmentId);
        setOriginalClass(student.currentClass || "");

        setFormData({
          firstName: student.firstName || "",
          lastName: student.lastName || "",
          otherName: student.otherName || "",
          gender: student.gender || "",
          dateOfBirth: student.dateOfBirth
            ? student.dateOfBirth.split("T")[0]
            : "",
          currentClass: student.currentClass || "",
          session: student.session || "",
          parentName: student.parentName || "",
          parentPhone: student.parentPhone || "",
          department: studentDepartmentId,
        });
      } catch (error) {
        console.error(error.response?.data || error.message);

        setMessage(
          error.response?.data?.message ||
            "Failed to load student information.",
        );

        setMessageType("error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => {
      const updated = {
        ...previous,
        [name]: value,
      };

      // Junior students cannot have departments.
      if (name === "currentClass" && JUNIOR_CLASSES.includes(value)) {
        updated.department = "";
      }

      return updated;
    });

    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");

    try {
      const payload = {
        ...formData,
      };

      /*
       * Do not send an unchanged department value.
       *
       * This allows existing senior students without
       * departments to have their other information edited.
       */
      delete payload.department;

      const departmentActuallyChanged =
        formData.department !== originalDepartment;

      const classActuallyChanged = formData.currentClass !== originalClass;

      if (departmentActuallyChanged) {
        payload.department = formData.department || null;
      }

      /*
       * A class change is sent separately.
       * The backend will validate the resulting
       * class/department combination.
       */
      if (classActuallyChanged) {
        payload.currentClass = formData.currentClass;
      }

      await api.put(`/students/${studentId}`, payload);

      setMessage("Student updated successfully.");
      setMessageType("success");

      setTimeout(() => {
        navigate(`/students/${studentId}`);
      }, 1000);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update student.");

      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = `
    w-full
    bg-slate-800
    border
    border-white/10
    text-white
    rounded-xl
    px-4
    py-3
    outline-none
    focus:border-green-500
  `;

  if (loading) {
    return (
      <div className="text-white text-center mt-10">Loading student...</div>
    );
  }

  return (
    <div className="text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Student</h1>

          <p className="text-gray-400 mt-2">Update student information</p>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="
            flex items-center gap-2
            bg-slate-800 px-4 py-2 rounded-xl
          "
        >
          <FaArrowLeft />
          Back
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl mb-6 ${
            messageType === "success"
              ? "bg-green-600/20 text-green-400"
              : "bg-red-600/20 text-red-400"
          }`}
        >
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="
          bg-slate-900
          border border-white/10
          shadow-xl rounded-2xl p-8
          grid grid-cols-1 md:grid-cols-2 gap-6
        "
      >
        <input
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          placeholder="First Name"
          className={inputStyle}
          required
        />

        <input
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          placeholder="Last Name"
          className={inputStyle}
          required
        />

        <input
          name="otherName"
          value={formData.otherName}
          onChange={handleChange}
          placeholder="Other Name"
          className={inputStyle}
        />

        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className={inputStyle}
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <input
          type="date"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={handleChange}
          className={inputStyle}
        />

        <select
          name="currentClass"
          value={formData.currentClass}
          onChange={handleChange}
          className={inputStyle}
          required
        >
          <option value="">Select Class</option>

          {ALL_CLASSES.map((schoolClass) => (
            <option key={schoolClass} value={schoolClass}>
              {schoolClass}
            </option>
          ))}
        </select>

        {isSeniorClass && (
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Department
            </label>

            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className={inputStyle}
            >
              <option value="">Select Department</option>

              {departments.map((department) => (
                <option key={department._id} value={department._id}>
                  {department.name}
                </option>
              ))}
            </select>

            {!formData.department && (
              <p className="text-amber-400 text-xs mt-2">
                This student has not yet been assigned a department.
              </p>
            )}
          </div>
        )}

        <input
          name="session"
          value={formData.session}
          onChange={handleChange}
          placeholder="Session"
          className={inputStyle}
        />

        <input
          name="parentName"
          value={formData.parentName}
          onChange={handleChange}
          placeholder="Parent Name"
          className={inputStyle}
        />

        <input
          name="parentPhone"
          value={formData.parentPhone}
          onChange={handleChange}
          placeholder="Parent Phone"
          className={inputStyle}
        />

        <button
          type="submit"
          disabled={saving}
          className="
            md:col-span-2
            flex justify-center items-center gap-3
            bg-green-600 hover:bg-green-700
            py-3 rounded-xl font-semibold
            disabled:opacity-50
          "
        >
          <FaSave />
          {saving ? "Saving..." : "Update Student"}
        </button>
      </form>
    </div>
  );
}

export default EditStudent;
