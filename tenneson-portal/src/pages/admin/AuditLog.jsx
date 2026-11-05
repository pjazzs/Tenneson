import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

const PAGE_SIZE = 20;

const AuditLog = () => {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);

      try {
        const response = await api.get("/audit", {
          params: {
            page,
            limit: PAGE_SIZE,
          },
        });

        setLogs(response.data.logs || []);
        setTotalPages(response.data.totalPages || 0);
        setTotalLogs(response.data.count || 0);
      } catch (error) {
        console.log(error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [page]);

  const handlePrevious = () => {
    setPage((currentPage) => Math.max(currentPage - 1, 1));
  };

  const handleNext = () => {
    setPage((currentPage) => Math.min(currentPage + 1, totalPages));
  };

  const firstRecord = totalLogs === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const lastRecord = Math.min(page * PAGE_SIZE, totalLogs);

  return (
    <div className="text-white">
      {/* PAGE HEADER */}
      <div
        className="
          flex flex-col
          sm:flex-row
          sm:justify-between
          sm:items-center
          gap-4
          mb-6
        "
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>

          <p className="text-gray-600 mt-2">
            Track important activities performed by administrators.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="
            bg-slate-800
            hover:bg-slate-700
            text-white
            px-5 py-2
            rounded-xl
            text-sm
            transition
            whitespace-nowrap
            self-start
            sm:self-auto
          "
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* AUDIT LOG TABLE */}
      <div
        className="
          bg-slate-900
          rounded-2xl
          border border-white/10
          overflow-hidden
        "
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-225">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="p-4 text-left whitespace-nowrap">User</th>

                <th className="p-4 text-left whitespace-nowrap">Action</th>

                <th className="p-4 text-left whitespace-nowrap">Module</th>

                <th className="p-4 text-left whitespace-nowrap">Description</th>

                <th className="p-4 text-left whitespace-nowrap">Date</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center p-10 text-gray-400">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-10 text-gray-400">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log._id}
                    className="
                      border-b border-white/10
                      hover:bg-white/5
                    "
                  >
                    {/* USER */}
                    <td className="p-4 whitespace-nowrap">
                      {log.user?.fullName || "System"}
                    </td>

                    {/* ACTION */}
                    <td className="p-4">
                      <span
                        className="
                          bg-blue-500/20
                          text-blue-400
                          px-3 py-1
                          rounded-full
                          text-sm
                          whitespace-nowrap
                        "
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* MODULE */}
                    <td className="p-4 whitespace-nowrap">{log.module}</td>

                    {/* DESCRIPTION */}
                    <td className="p-4 text-gray-300 max-w-md">
                      {log.description}
                    </td>

                    {/* DATE */}
                    <td className="p-4 text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div
          className="
            flex flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-4
            p-4
            border-t border-white/10
          "
        >
          <p className="text-sm text-gray-400">
            Showing{" "}
            <span className="text-white font-medium">
              {firstRecord}–{lastRecord}
            </span>{" "}
            of <span className="text-white font-medium">{totalLogs}</span> audit
            logs
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={loading || page <= 1}
              className="
                px-4 py-2
                rounded-lg
                text-sm
                border border-white/10
                bg-slate-800
                hover:bg-slate-700
                disabled:opacity-40
                disabled:cursor-not-allowed
                transition
              "
            >
              ← Previous
            </button>

            <span className="text-sm text-gray-300 whitespace-nowrap">
              Page {page} of {Math.max(totalPages, 1)}
            </span>

            <button
              type="button"
              onClick={handleNext}
              disabled={loading || totalPages === 0 || page >= totalPages}
              className="
                px-4 py-2
                rounded-lg
                text-sm
                border border-white/10
                bg-slate-800
                hover:bg-slate-700
                disabled:opacity-40
                disabled:cursor-not-allowed
                transition
              "
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
