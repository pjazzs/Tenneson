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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5 text-white">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
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

        <div className="p-6 space-y-5">
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

          <div>
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
              Student Information
            </h2>

            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-gray-400 text-xs">Student Name</p>
                <p className="font-semibold">
                  {student.name || "Not available"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>
            </div>
          </div>

          {/* RESULT DETAILS */}

          <div>
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
              Result Information
            </h2>

            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
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
          </div>

          {/* DOCUMENT DETAILS */}

          <div>
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
          </div>

          {/* AUTHENTICITY NOTICE */}

          <div className="flex items-start gap-3 text-gray-400 text-xs">
            <FaShieldAlt className="text-green-500 text-lg shrink-0 mt-0.5" />

            <p>
              Verification is based on the official document records maintained
              by Tenneson Comprehensive College. This page confirms document
              status; it does not disclose the student's academic scores.
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
