import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaFilePdf,
  FaShieldAlt,
} from "react-icons/fa";

import api from "../../api/axios";

function VerifyOfficialResult() {
  const { code } = useParams();

  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const verifyResult = async () => {
      try {
        setLoading(true);
        setError("");
        setVerification(null);

        if (!code) {
          setError("Invalid result verification link.");
          return;
        }

        const response = await api.get(
          `/verify-result/${encodeURIComponent(code)}`,
        );

        if (active) {
          setVerification(response.data);
        }
      } catch (err) {
        console.error(
          "Official result verification error:",
          err.response?.data || err.message,
        );

        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to verify this result document.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    verifyResult();

    return () => {
      active = false;
    };
  }, [code]);

  const status = verification?.status;
  const isValid = verification?.valid === true;

  const statusConfig = {
    valid: {
      title: "Official Result Verified",
      description:
        "This result document is authentic and currently valid in the school records.",
      icon: <FaCheckCircle />,
      color: "green",
    },
    superseded: {
      title: "Document Superseded",
      description:
        "This result document has been replaced by a newer version. It is no longer the current official document.",
      icon: <FaExclamationTriangle />,
      color: "amber",
    },
    revoked: {
      title: "Document Revoked",
      description:
        "This result document has been revoked by the school and is no longer valid.",
      icon: <FaTimesCircle />,
      color: "red",
    },
  };

  const config = statusConfig[status];

  const formattedDate = (date) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatScore = (value) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    return value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-5">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p>Verifying official result document...</p>
        </div>
      </div>
    );
  }

  if (error || !verification || !config) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5 text-white">
        <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <FaTimesCircle className="text-red-500 text-5xl mx-auto mb-5" />

          <h1 className="text-2xl font-bold mb-3">Verification Failed</h1>

          <p className="text-gray-400">
            {error || "This result document could not be verified."}
          </p>

          <p className="text-gray-500 text-xs mt-6">
            Tenneson Comprehensive College
          </p>
        </div>
      </div>
    );
  }

  const colorClasses = {
    green: {
      header: "bg-green-600",
      border: "border-green-500/20",
      text: "text-green-400",
      badge: "bg-green-500/20 text-green-400",
    },
    amber: {
      header: "bg-amber-600",
      border: "border-amber-500/20",
      text: "text-amber-400",
      badge: "bg-amber-500/20 text-amber-400",
    },
    red: {
      header: "bg-red-600",
      border: "border-red-500/20",
      text: "text-red-400",
      badge: "bg-red-500/20 text-red-400",
    },
  };

  const colors = colorClasses[config.color];
  const student = verification.student || {};
  const result = verification.result || {};
  const document = verification.document || {};
  const subjects = Array.isArray(result.subjects) ? result.subjects : [];
  const attendance = result.attendance || {};
  const comments = result.comments || {};

  const summaryItems = [
    ["Total Score", formatScore(result.totalScore)],
    ["Total Obtainable", formatScore(result.totalObtainableMarks)],
    [
      "Overall Percentage",
      result.overallPercentage !== null &&
      result.overallPercentage !== undefined
        ? `${Number(result.overallPercentage).toFixed(2)}%`
        : "—",
    ],
    ["Performance", result.performanceComment || "—"],
  ];

  const attendanceItems = [
    ["Days School Opened", attendance.daysSchoolOpened],
    ["Days Present", attendance.daysPresent],
    ["Days Absent", attendance.daysAbsent],
  ];

  const commentItems = [
    ["Class Teacher", comments.classTeacher],
    ["Principal", comments.principal],
    ["Performance", comments.performance],
  ].filter(([, value]) => Boolean(value));

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-5 text-white">
      <div className="w-full max-w-5xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className={`${colors.header} p-7 text-center`}>
          <div className="text-5xl mx-auto mb-4 flex justify-center">
            {config.icon}
          </div>

          <h1 className="text-2xl font-bold">{config.title}</h1>

          <p className="mt-2 text-sm text-white/80">
            Official result document verification
          </p>
        </div>

        <div className="p-5 sm:p-7 space-y-7">
          {/* STATUS MESSAGE */}
          <div
            className={`rounded-xl border ${colors.border} bg-slate-800 p-4`}
          >
            <p className={`font-semibold ${colors.text}`}>
              {isValid ? "VALID DOCUMENT" : "DOCUMENT NOT VALID"}
            </p>

            <p className="text-gray-300 text-sm mt-2">{config.description}</p>
          </div>

          {/* STUDENT DETAILS */}
          <section>
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
              Student Information
            </h2>

            <div className="bg-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-xs">Student Name</p>
                <p className="font-semibold">
                  {student.name || "Not available"}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-xs">Student ID</p>
                <p className="font-semibold">
                  {student.studentId || "Not available"}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-xs">Class at Issuance</p>
                <p className="font-semibold">
                  {student.class || "Not available"}
                </p>
              </div>

              {student.department && (
                <div>
                  <p className="text-gray-400 text-xs">Department</p>
                  <p className="font-semibold">{student.department}</p>
                </div>
              )}
            </div>
          </section>

          {/* RESULT DETAILS */}
          <section>
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
              Result Information
            </h2>

            <div className="bg-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-xs">Academic Session</p>
                <p className="font-semibold">
                  {result.academicSession || "Not available"}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-xs">Term</p>
                <p className="font-semibold">
                  {result.term || "Not available"}
                </p>
              </div>
            </div>
          </section>

          {/* SUBJECT RESULTS */}
          <section>
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
              Subject Results
            </h2>

            {subjects.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-162.5 text-sm">
                  <thead className="bg-slate-800 text-gray-300">
                    <tr>
                      {[
                        "Subject",
                        "CA 1",
                        "CA 2",
                        "Exam",
                        "Total",
                        "Grade",
                        "Remark",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={`px-3 py-3 font-semibold ${
                            heading === "Subject" || heading === "Remark"
                              ? "text-left"
                              : "text-center"
                          }`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {subjects.map((subject, index) => (
                      <tr
                        key={`${subject.subject}-${index}`}
                        className={
                          index % 2 === 0 ? "bg-slate-800/70" : "bg-slate-900"
                        }
                      >
                        <td className="px-3 py-3 font-medium">
                          {subject.subject || "—"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {formatScore(subject.ca1)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {formatScore(subject.ca2)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {formatScore(subject.exam)}
                        </td>
                        <td className="px-3 py-3 text-center font-semibold">
                          {formatScore(subject.total)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {subject.grade || "—"}
                        </td>
                        <td className="px-3 py-3">{subject.remark || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl p-5 text-gray-400 text-sm">
                No subject results are available in this document.
              </div>
            )}
          </section>

          {/* RESULT SUMMARY */}
          <section>
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
              Result Summary
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {summaryItems.map(([label, value]) => (
                <div key={label} className="bg-slate-800 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-2">{label}</p>
                  <p className="font-semibold wrap-break-word">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ATTENDANCE */}
          <section>
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
              Attendance
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {attendanceItems.map(([label, value]) => (
                <div key={label} className="bg-slate-800 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-2">{label}</p>
                  <p className="font-semibold">{formatScore(value)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SCHOOL COMMENTS */}
          {commentItems.length > 0 && (
            <section>
              <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
                School Comments
              </h2>

              <div className="bg-slate-800 rounded-xl p-4 space-y-4">
                {commentItems.map(([label, value]) => (
                  <div key={label}>
                    <p className="text-gray-400 text-xs mb-1">{label}</p>
                    <p className="text-sm leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* DOCUMENT DETAILS */}
          <section>
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
              Document Information
            </h2>

            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <FaFilePdf className="text-red-400 text-xl" />

                <div>
                  <p className="text-gray-400 text-xs">Document Type</p>
                  <p className="font-semibold">Official Academic Result</p>
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-xs">Verification Code</p>
                <p className="font-mono text-sm break-all">
                  {document.verificationCode}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-xs">Date Issued</p>
                <p className="font-semibold">
                  {formattedDate(document.issuedAt)}
                </p>
              </div>

              {status === "superseded" && (
                <div>
                  <p className="text-gray-400 text-xs">Superseded Date</p>
                  <p className="font-semibold">
                    {formattedDate(document.supersededAt)}
                  </p>
                </div>
              )}

              {status === "revoked" && (
                <>
                  <div>
                    <p className="text-gray-400 text-xs">Revoked Date</p>
                    <p className="font-semibold">
                      {formattedDate(document.revokedAt)}
                    </p>
                  </div>

                  {document.revocationReason && (
                    <div>
                      <p className="text-gray-400 text-xs">Reason</p>
                      <p className="text-red-300 text-sm">
                        {document.revocationReason}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* AUTHENTICITY NOTICE */}
          <div className="flex items-start gap-3 text-gray-400 text-xs">
            <FaShieldAlt className="text-green-500 text-lg shrink-0 mt-0.5" />

            <p>
              Verification is based on the exact official document snapshot
              maintained by Tenneson Comprehensive College at the time of
              issuance. The displayed academic information corresponds to that
              issued document.
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t border-white/10 p-4 text-center text-xs text-gray-500">
          TENNESON COMPREHENSIVE COLLEGE
          <p className="mt-1">Obantoko, Abeokuta, Ogun State</p>
        </div>
      </div>
    </div>
  );
}

export default VerifyOfficialResult;
