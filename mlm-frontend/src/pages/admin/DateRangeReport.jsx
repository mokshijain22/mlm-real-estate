import { useState } from "react";
import api from "../../api/axios.js";

function DateRangeReport() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  useState(() => {
    api.get("/admin/projects").then((res) => setProjects(res.data.data || res.data)).catch(() => {});
  }, []);

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

  const runReport = () => {
    if (!dateFrom || !dateTo) {
      setError("Please select both From and To dates.");
      return;
    }
    setError(null);
    setLoading(true);
    const params = { date_from: dateFrom, date_to: dateTo };
    if (projectId) params.project_id = projectId;
    api
      .get("/admin/reports/date-range", { params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  const handleExport = async () => {
    if (!dateFrom || !dateTo) return;
    setExporting(true);
    try {
      const params = { date_from: dateFrom, date_to: dateTo };
      if (projectId) params.project_id = projectId;
      const res = await api.get("/admin/reports/date-range/export", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `date_range_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Export failed: " + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h3 className="mt-2 mb-4">Date Range Report</h3>
          {data && (
            <button type="button" className="btn btn-success" onClick={handleExport} disabled={exporting}>
              <iconify-icon icon="solar:download-bold-duotone" className="me-1"></iconify-icon>
              {exporting ? "Exporting..." : "Export to CSV"}
            </button>
          )}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">From Date</label>
              <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">To Date</label>
              <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Project</label>
              <select className="form-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <button type="button" className="btn btn-primary w-100" onClick={runReport} disabled={loading}>
                {loading ? "Loading..." : "Generate Report"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {data && (
        <>
          <div className="row row-cols-2 row-cols-md-3 row-cols-xl-6 g-3 mb-3">
            <div className="col">
              <div className="card bg-primary-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-primary-emphasis fw-semibold mb-1">Bookings</p>
                  <h4 className="fs-20 fw-bold text-primary mb-0">{data.summary.total_bookings}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-info-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-info-emphasis fw-semibold mb-1">Booking Value</p>
                  <h4 className="fs-20 fw-bold text-info mb-0">₹{fmt(data.summary.total_booking_value)}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-success-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-success-emphasis fw-semibold mb-1">Total Collected</p>
                  <h4 className="fs-20 fw-bold text-success mb-0">₹{fmt(data.summary.total_collected)}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-warning-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-warning-emphasis fw-semibold mb-1">EMI Collected</p>
                  <h4 className="fs-20 fw-bold text-warning mb-0">₹{fmt(data.summary.total_emi_collected)}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-secondary-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-secondary-emphasis fw-semibold mb-1">Commission BV</p>
                  <h4 className="fs-20 fw-bold text-secondary mb-0">₹{fmt(data.summary.total_commission_bv)}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-dark-subtle border-0 h-100">
                <div className="card-body">
                  <p className="fw-semibold mb-1">Commission PV</p>
                  <h4 className="fs-20 fw-bold mb-0">₹{fmt(data.summary.total_commission_pv)}</h4>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Bookings in Range</h5></div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Booking #</th><th>Date</th><th>Customer</th><th>Project</th><th>Plot</th><th>Agent</th><th>Amount</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bookings.length === 0 && (
                    <tr><td colSpan="8" className="text-center text-muted py-4">No bookings in this range.</td></tr>
                  )}
                  {data.bookings.map((b) => (
                    <tr key={b._id}>
                      <td>{b.bookingNumber}</td>
                      <td>{fmtDate(b.createdAt)}</td>
                      <td>{b.customer?.name || "N/A"}</td>
                      <td>{b.project?.name || "N/A"}</td>
                      <td>{b.plot?.plotNumber || "N/A"}</td>
                      <td>{b.agent?.name || "N/A"}</td>
                      <td>₹{fmt(b.totalAmount)}</td>
                      <td><span className={`badge bg-${b.status === "active" ? "success" : b.status === "cancelled" ? "danger" : "secondary"}-subtle text-${b.status === "active" ? "success" : b.status === "cancelled" ? "danger" : "secondary"}`}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DateRangeReport;