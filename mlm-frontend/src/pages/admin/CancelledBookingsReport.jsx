import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import ExportButton from "../../components/shared/ExportButton.jsx";

function CancelledBookingsReport() {
  const [bookings, setBookings] = useState(null);
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get("/admin/projects").then((res) => setProjects(res.data.data || res.data)).catch(() => {});
  }, []);

  const buildParams = () => {
    const params = { page, type };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (projectId) params.project_id = projectId;
    return params;
  };

  useEffect(() => {
    api
      .get("/admin/reports/cancelled-bookings", { params: buildParams() })
      .then((res) => {
        setBookings(res.data.data);
        setMeta(res.data.meta);
        setSummary(res.data.summary);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, projectId, type, page]);

  const getExportParams = () => {
    const params = { ...buildParams() };
    delete params.page;
    return params;
  };

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h3 className="mt-2 mb-4">Cancelled Bookings Report</h3>
          <ExportButton url="/admin/reports/cancelled-bookings/export" params={getExportParams()} title="Cancelled Bookings Report" filenamePrefix="cancelled_bookings" />
        </div>
      </div>

      {summary && (
        <div className="row row-cols-2 row-cols-md-2 g-3 mb-3">
          <div className="col">
            <div className="card bg-danger-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-danger-emphasis fw-semibold mb-1">Total Cancelled/Rejected</p>
                <h4 className="fs-20 fw-bold text-danger mb-0">{summary.total_cancelled}</h4>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-secondary-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-secondary-emphasis fw-semibold mb-1">Total Value</p>
                <h4 className="fs-20 fw-bold text-secondary mb-0">₹{fmt(summary.total_value)}</h4>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">From Date</label>
              <input type="date" className="form-control" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} />
            </div>
            <div className="col-md-3">
              <label className="form-label">To Date</label>
              <input type="date" className="form-control" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Project</label>
              <select className="form-select" value={projectId} onChange={(e) => { setPage(1); setProjectId(e.target.value); }}>
                <option value="">All Projects</option>
                {projects.map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Type</label>
              <select className="form-select" value={type} onChange={(e) => { setPage(1); setType(e.target.value); }}>
                <option value="all">All</option>
                <option value="cancelled">Cancelled (post-approval)</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr><th>Booking #</th><th>Customer</th><th>Project</th><th>Plot</th><th>Agent</th><th>Amount</th><th>Status</th><th>Reason</th><th>Date</th></tr>
            </thead>
            <tbody>
              {bookings && bookings.length === 0 && (
                <tr><td colSpan="9" className="text-center text-muted py-4">No cancelled/rejected bookings found.</td></tr>
              )}
              {bookings?.map((b) => (
                <tr key={b._id}>
                  <td>{b.bookingNumber}</td>
                  <td>{b.customer?.name || "N/A"}</td>
                  <td>{b.project?.name || "N/A"}</td>
                  <td>{b.plot?.plotNumber || "N/A"}</td>
                  <td>{b.agent?.name || "N/A"}</td>
                  <td>₹{fmt(b.totalAmount)}</td>
                  <td><span className="badge bg-danger-subtle text-danger">{b.status === "cancelled" ? "Cancelled" : "Rejected"}</span></td>
                  <td>{b.rejectionReason || b.approvalReason || "-"}</td>
                  <td>{fmtDate(b.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && (
          <div className="card-footer d-flex justify-content-between align-items-center">
            <span className="text-muted">Page {meta.page} of {meta.lastPage || 1} ({meta.total} total)</span>
            <div>
              <button type="button" className="btn btn-sm btn-outline-secondary me-2" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page >= meta.lastPage} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CancelledBookingsReport;
