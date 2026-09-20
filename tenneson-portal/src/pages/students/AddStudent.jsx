import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserPlus, FaArrowLeft } from "react-icons/fa";
import api from "../../api/axios";

function AddStudent() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    admissionYear: "",
    firstName: "",
    lastName: "",
    otherName: "",
    gender: "",
    dateOfBirth: "",
    currentClass: "",
    session: "",
    parentName: "",
    parentPhone: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Admission year: numbers only, maximum 4 digits
    if (name === "admissionYear") {
      const numericValue = value.replace(/\D/g, "").slice(0, 4);

      setFormData({
        ...formData,
        [name]: numericValue,
      });

      return;
    }

    // Parent phone: numbers only, maximum 11 digits
    if (name === "parentPhone") {
      const numericValue = value.replace(/\D/g, "").slice(0, 11);

      setFormData({
        ...formData,
        [name]: numericValue,
      });

      return;
    }

    // Session: numbers and slash only, maximum 9 characters
    if (name === "session") {
      const sessionValue = value.replace(/[^\d/]/g, "").slice(0, 9);

      setFormData({
        ...formData,
        [name]: sessionValue,
      });

      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    // Admission year validation
    if (!/^\d{4}$/.test(formData.admissionYear)) {
      setMessage("Admission year must be a valid 4-digit year.");

      setLoading(false);
      return;
    }

    // Session validation
    if (!/^\d{4}\/\d{4}$/.test(formData.session)) {
      setMessage("Session must be in the format YYYY/YYYY.");

      setLoading(false);
      return;
    }

    // Parent phone validation
    if (!/^\d{11}$/.test(formData.parentPhone)) {
      setMessage("Parent phone must contain exactly 11 digits.");

      setLoading(false);
      return;
    }

    try {
      await api.post("/students", formData);

      setMessage("Student added successfully");

      setTimeout(() => {
        navigate("/students");
      }, 1200);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to add student");
    } finally {
      setLoading(false);
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

  return (
    <div className="text-white">
      {/* Header */}
      <div
        className="
        flex
        justify-between
        items-center
        mb-8
      "
      >
        <div>
          <h1
            className="
            text-3xl
            font-bold
            text-gray-900
          "
          >
            Add Student
          </h1>

          <p
            className="
            text-gray-600
            mt-2
          "
          >
            Register a new student into the portal
          </p>
        </div>

        <button
          onClick={() => navigate("/students")}
          className="
            flex
            items-center
            gap-2
            bg-slate-800
            px-4
            py-2
            rounded-xl
          "
        >
          <FaArrowLeft />
          Back
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`
            p-4
            rounded-xl
            mb-6
            ${
              message.includes("success")
                ? "bg-green-600/20 text-green-400"
                : "bg-red-600/20 text-red-400"
            }
          `}
        >
          {message}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="
          bg-slate-900
          border
          border-white/10
          shadow-xl
          rounded-2xl
          p-8
          grid
          grid-cols-1
          md:grid-cols-2
          gap-6
        "
      >
        {/* Admission Year */}
        <input
          type="text"
          name="admissionYear"
          placeholder="Admission Year e.g 2023"
          value={formData.admissionYear}
          onChange={handleChange}
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          className={inputStyle}
          required
        />

        {/* First Name */}
        <input
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          className={inputStyle}
          required
        />

        {/* Last Name */}
        <input
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
          className={inputStyle}
          required
        />

        {/* Other Name */}
        <input
          name="otherName"
          placeholder="Other Name"
          value={formData.otherName}
          onChange={handleChange}
          className={inputStyle}
        />

        {/* Gender */}
        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className={inputStyle}
          required
        >
          <option value="">Select Gender</option>

          <option value="Male">Male</option>

          <option value="Female">Female</option>
        </select>

        {/* Date of Birth */}
        <input
          type="date"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={handleChange}
          className={inputStyle}
          required
        />

        {/* Current Class */}
        <select
          name="currentClass"
          value={formData.currentClass}
          onChange={handleChange}
          className={inputStyle}
          required
        >
          <option value="">Select Current Class</option>

          <option value="JSS1">JSS1</option>

          <option value="JSS2">JSS2</option>

          <option value="JSS3">JSS3</option>

          <option value="SS1">SS1</option>

          <option value="SS2">SS2</option>

          <option value="SS3">SS3</option>
        </select>

        {/* Session */}
        <input
          type="text"
          name="session"
          placeholder="Session e.g 2026/2027"
          value={formData.session}
          onChange={handleChange}
          inputMode="numeric"
          maxLength={9}
          pattern="\d{4}/\d{4}"
          className={inputStyle}
          required
        />

        {/* Parent Name */}
        <input
          name="parentName"
          placeholder="Parent Name"
          value={formData.parentName}
          onChange={handleChange}
          className={inputStyle}
          required
        />

        {/* Parent Phone */}
        <input
          type="tel"
          name="parentPhone"
          placeholder="Parent Phone e.g 08012345678"
          value={formData.parentPhone}
          onChange={handleChange}
          inputMode="numeric"
          maxLength={11}
          pattern="\d{11}"
          className={inputStyle}
          required
        />

        {/* Submit */}
        <button
          disabled={loading}
          className="
            md:col-span-2
            flex
            justify-center
            items-center
            gap-3
            bg-green-600
            hover:bg-green-700
            py-3
            rounded-xl
            font-semibold
            transition
            disabled:opacity-50
          "
        >
          <FaUserPlus />

          {loading ? "Adding Student..." : "Add Student"}
        </button>
      </form>
    </div>
  );
}

export default AddStudent;
