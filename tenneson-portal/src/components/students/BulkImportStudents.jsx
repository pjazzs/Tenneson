import { useState } from "react";

import {
  FaUpload,
  FaDownload,
  FaTimes,
  FaSpinner,
  FaCheckCircle,
  FaKey,
} from "react-icons/fa";

import * as XLSX from "xlsx";

import api from "../../api/axios";

function BulkImportStudents({ onImportSuccess }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [downloadingCredentials, setDownloadingCredentials] = useState(false);
  const [credentialsDownloaded, setCredentialsDownloaded] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [credentialError, setCredentialError] = useState("");

  // ==========================================
  // Download Excel Template
  // ==========================================

  const downloadTemplate = () => {
    const template = [
      {
        firstName: "",
        lastName: "",
        otherName: "",
        gender: "",
        dateOfBirth: "MM/DD/YYYY",
        admissionYear: "",
        currentClass: "",
        session: "",
        parentName: "",
        parentPhone: "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    XLSX.writeFile(workbook, "student_import_template.xlsx");
  };

  // ==========================================
  // Handle Import
  // ==========================================

  const handleImport = async () => {
    if (!selectedFile) {
      alert("Please select an Excel file.");
      return;
    }

    try {
      setImporting(true);
      setCredentialError("");
      setCredentialsDownloaded(false);

      const formData = new FormData();

      formData.append("file", selectedFile);

      const response = await api.post("/students/import", formData);

      setImportResult(response.data);

      setSelectedFile(null);

      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (error) {
      console.error(
        "Bulk import error:",
        error.response?.data || error.message,
      );

      alert(
        error.response?.data?.message ||
          "Failed to import students. Please try again.",
      );
    } finally {
      setImporting(false);
    }
  };

  // ==========================================
  // Download Credential Report
  // ==========================================

  const downloadCredentialReport = async () => {
    const reportToken = importResult?.credentialReport?.reportToken;

    if (!reportToken) {
      setCredentialError(
        "Credential report is unavailable. Please import the students again.",
      );

      return;
    }

    try {
      setDownloadingCredentials(true);
      setCredentialError("");

      const response = await api.get("/students/import/credential-report", {
        headers: {
          "X-Credential-Report-Token": reportToken,
        },
        responseType: "blob",
      });

      // ==========================================
      // Create Downloadable File
      // ==========================================

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = "Student-Credentials.xlsx";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      // ==========================================
      // Mark Report As Downloaded
      // ==========================================

      setCredentialsDownloaded(true);
    } catch (error) {
      console.error(
        "Credential report download error:",
        error.response?.data || error.message,
      );

      /*
       * Axios returns the backend error as a Blob when
       * responseType is "blob".
       *
       * Try to read the backend JSON error message.
       */

      let message =
        "Unable to download the credential report. Please try again.";

      if (error.response?.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();

          const errorData = JSON.parse(errorText);

          message = errorData.message || message;
        } catch {
          // Keep default error message.
        }
      } else {
        message = error.response?.data?.message || message;
      }

      setCredentialError(message);
    } finally {
      setDownloadingCredentials(false);
    }
  };

  // ==========================================
  // Close Modal
  // ==========================================

  const closeModal = () => {
    setShowModal(false);
    setImportResult(null);
    setSelectedFile(null);
    setCredentialError("");
    setCredentialsDownloaded(false);
  };

  // ==========================================
  // Render
  // ==========================================

  return (
    <>
      {/* Import Button */}

      <button
        onClick={() => {
          setShowModal(true);
          setImportResult(null);
          setCredentialError("");
          setCredentialsDownloaded(false);
        }}
        className="
          flex
          items-center
          gap-2
          bg-blue-600
          hover:bg-blue-700
          px-5
          py-3
          rounded-xl
          transition
          shadow-lg
        "
      >
        <FaUpload />
        Import Excel
      </button>

      {/* Modal */}

      {showModal && (
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
            overflow-y-auto
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
              text-white
            "
          >
            {/* Header */}

            <div
              className="
                flex
                justify-between
                items-center
                mb-6
              "
            >
              <div>
                <h2 className="text-xl font-bold">Bulk Import Students</h2>

                <p className="text-gray-400 text-sm mt-1">
                  Upload student records using Excel.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="
                  text-gray-400
                  hover:text-white
                "
              >
                <FaTimes />
              </button>
            </div>

            {/* Download Template */}

            <button
              onClick={downloadTemplate}
              className="
                w-full
                flex
                items-center
                justify-center
                gap-2
                bg-green-600
                hover:bg-green-700
                py-3
                rounded-xl
                mb-5
              "
            >
              <FaDownload />
              Download Excel Template
            </button>

            {/* File Upload */}

            <div
              className="
                border
                border-dashed
                border-white/20
                rounded-xl
                p-5
                text-center
              "
            >
              <input
                id="excel"
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] || null);
                }}
                className="
                  w-full
                  text-sm
                  text-gray-300
                "
              />

              {selectedFile && (
                <p
                  className="
                    mt-3
                    text-sm
                    text-green-400
                  "
                >
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            {/* Import Button */}

            {!importResult && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="
                  mt-5
                  w-full
                  flex
                  items-center
                  justify-center
                  gap-2
                  bg-blue-600
                  hover:bg-blue-700
                  disabled:opacity-50
                  py-3
                  rounded-xl
                  font-semibold
                "
              >
                {importing ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <FaUpload />
                    Import Students
                  </>
                )}
              </button>
            )}

            {/* Import Result */}

            {importResult && (
              <div
                className="
                  mt-6
                  space-y-4
                "
              >
                {/* Summary */}

                <div
                  className="
                    bg-green-600/20
                    border
                    border-green-500/30
                    rounded-xl
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      text-green-400
                      font-semibold
                      mb-3
                    "
                  >
                    <FaCheckCircle />
                    Import Completed
                  </div>

                  <div
                    className="
                      grid
                      grid-cols-3
                      gap-3
                      text-center
                    "
                  >
                    {/* Total */}

                    <div
                      className="
                        bg-white/5
                        rounded-lg
                        p-3
                      "
                    >
                      <p className="text-gray-400 text-xs">Total Rows</p>

                      <p className="text-lg font-bold">
                        {importResult.summary?.totalRows ?? 0}
                      </p>
                    </div>

                    {/* Imported */}

                    <div
                      className="
                        bg-white/5
                        rounded-lg
                        p-3
                      "
                    >
                      <p className="text-gray-400 text-xs">Imported</p>

                      <p className="text-lg font-bold text-green-400">
                        {importResult.summary?.imported ?? 0}
                      </p>
                    </div>

                    {/* Skipped */}

                    <div
                      className="
                        bg-white/5
                        rounded-lg
                        p-3
                      "
                    >
                      <p className="text-gray-400 text-xs">Skipped</p>

                      <p className="text-lg font-bold text-red-400">
                        {importResult.summary?.skipped ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Credential Report */}

                {importResult.credentialReport && (
                  <div
                    className="
                      bg-blue-600/10
                      border
                      border-blue-500/30
                      rounded-xl
                      p-4
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        text-blue-400
                        font-semibold
                        mb-2
                      "
                    >
                      <FaKey />
                      Student Login Credentials
                    </div>

                    <p className="text-gray-300 text-sm mb-4">
                      A temporary username and password has been generated for
                      each imported student.
                    </p>

                    <p className="text-yellow-400 text-xs mb-4">
                      Download this credential report now. It is available for
                      one download only and expires after 15 minutes.
                    </p>

                    {!credentialsDownloaded ? (
                      <button
                        onClick={downloadCredentialReport}
                        disabled={downloadingCredentials}
                        className="
                          w-full
                          flex
                          items-center
                          justify-center
                          gap-2
                          bg-blue-600
                          hover:bg-blue-700
                          disabled:opacity-50
                          py-3
                          rounded-xl
                          font-semibold
                        "
                      >
                        {downloadingCredentials ? (
                          <>
                            <FaSpinner className="animate-spin" />
                            Preparing Credentials...
                          </>
                        ) : (
                          <>
                            <FaDownload />
                            Download Student Credentials
                          </>
                        )}
                      </button>
                    ) : (
                      <div
                        className="
                          flex
                          items-center
                          gap-2
                          justify-center
                          bg-green-600/20
                          border
                          border-green-500/30
                          text-green-400
                          py-3
                          rounded-xl
                          font-semibold
                        "
                      >
                        <FaCheckCircle />
                        Credentials Downloaded
                      </div>
                    )}

                    {/* Credential Error */}

                    {credentialError && (
                      <div
                        className="
                          mt-3
                          bg-red-600/10
                          border
                          border-red-500/20
                          rounded-lg
                          p-3
                          text-red-400
                          text-sm
                        "
                      >
                        {credentialError}
                      </div>
                    )}
                  </div>
                )}

                {/* Skipped Students */}

                {importResult.skippedStudents?.length > 0 && (
                  <div
                    className="
                      bg-red-600/10
                      border
                      border-red-500/20
                      rounded-xl
                      p-4
                      max-h-60
                      overflow-y-auto
                    "
                  >
                    <h3
                      className="
                        font-semibold
                        text-red-400
                        mb-3
                      "
                    >
                      Skipped Students
                    </h3>

                    {importResult.skippedStudents.map((item, index) => (
                      <div
                        key={index}
                        className="
                          border-b
                          border-white/10
                          py-3
                          text-sm
                        "
                      >
                        <p className="text-white">
                          {item.student?.firstName} {item.student?.lastName}
                        </p>

                        <p className="text-gray-400">Reason: {item.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Close */}

                <button
                  onClick={closeModal}
                  className="
                    w-full
                    bg-gray-700
                    hover:bg-gray-600
                    py-3
                    rounded-xl
                  "
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default BulkImportStudents;
