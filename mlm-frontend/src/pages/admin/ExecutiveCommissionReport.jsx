import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import ExportButton from "../../components/shared/ExportButton.jsx";

function ExecutiveCommissionReport() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/admin/projects").then((res) => setProjects(res.data.data || res.data)).catch(() => {});
  }, []);

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const buildParams = () => {
    const params = {};
    if (projectId) params.project_id = projectId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  };

  const runReport = () => {
    setError(null);
    setLoading(true);
    api
      .get("/admin/reports/executive-commissions", { params: buildParams() })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusBadge = (s) =>
    s === "Paid" ? (
      <span className="badge bg-success-subtle text-success">Paid</span>
    ) : (
      <span className="badge bg-warning-subtle text-warning">Pending</span>
    );

  return (
    <div>
      <div className="row mb-3">
        <div className="col-12">
          <h3 className="mt-2 mb-1">Executive Commission Report</h3>
          <p className="text-muted small">Plot-wise commission breakdown by executive and level (Sold By vs Commission To)</p>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
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
              <label className="form-label">From Date</label>
              <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">To Date</label>
              <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button type="button" className="btn btn-primary w-100" onClick={runReport} disabled={loading}>
                {loading ? "Loading..." : "Apply"}
              </button>
            </div>
          </div>
          {data && (
            <div className="mt-3">
              <ExportButton
                url="/admin/reports/executive-commissions/export"
                params={buildParams()}
                title="Executive Commission Report"
                filenamePrefix="executive_commission_report"
                className="btn btn-sm btn-success"
                label="Export"
              />
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {data && (
        <>
          <div className="row row-cols-2 row-cols-md-4 g-3 mb-3">
            <div className="col">
              <div className="card bg-primary-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-primary-emphasis fw-semibold mb-1">Total Plots</p>
                  <h4 className="fs-20 fw-bold text-primary mb-0">{data.summary.total_plots}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-success-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-success-emphasis fw-semibold mb-1">Sale Value</p>
                  <h4 className="fs-20 fw-bold text-success mb-0">₹{fmt(data.summary.sale_value)}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-info-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-info-emphasis fw-semibold mb-1">Customer Received</p>
                  <h4 className="fs-20 fw-bold text-info mb-0">₹{fmt(data.summary.customer_received)}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-danger-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-danger-emphasis fw-semibold mb-1">Customer Outstanding</p>
                  <h4 className="fs-20 fw-bold text-danger mb-0">₹{fmt(data.summary.customer_outstanding)}</h4>
                </div>
              </div>
            </div>
          </div>
          <div className="row row-cols-2 row-cols-md-3 g-3 mb-3">
            <div className="col">
              <div className="card bg-secondary-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-secondary-emphasis fw-semibold mb-1">Gross Commission</p>
                  <h4 className="fs-20 fw-bold text-secondary mb-0">₹{fmt(data.summary.gross_commission)}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-success-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-success-emphasis fw-semibold mb-1">Commission Paid</p>
                  <h4 className="fs-20 fw-bold text-success mb-0">₹{fmt(data.summary.commission_paid)}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-warning-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-warning-emphasis fw-semibold mb-1">Commission Outstanding</p>
                  <h4 className="fs-20 fw-bold text-warning mb-0">₹{fmt(data.summary.commission_outstanding)}</h4>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0" style={{ fontSize: "0.85rem" }}>
                <thead className="table-light">
                  <tr>
                    <th>Plot</th>
                    <th>Area</th>
                    <th>Project</th>
                    <th>Customer</th>
                    <th>Sold By</th>
                    <th>Commission To</th>
                    <th>Level</th>
                    <th>Collection Source</th>
                    <th>Cash</th>
                    <th>Bank</th>
                    <th>Cheque</th>
                    <th>Sale Value</th>
                    <th>Received</th>
                    <th>Cust. Outstanding</th>
                    <th>Gross Comm.</th>
                    <th>Paid Comm.</th>
                    <th>Comm. Outstanding</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.length === 0 && (
                    <tr><td colSpan={18} className="text-center text-muted py-4">No commission records found.</td></tr>
                  )}
                  {data.data.map((r, i) => (
                    <tr key={i}>
                      <td>{r.plot}</td>
                      <td>{r.area}</td>
                      <td>{r.project}</td>
                      <td>{r.customer}</td>
                      <td>{r.soldBy}</td>
                      <td>{r.commissionTo}</td>
                      <td>{r.level}</td>
                      <td>{r.collectionSource}</td>
                      <td>₹{fmt(r.cash)}</td>
                      <td>₹{fmt(r.bank)}</td>
                      <td>₹{fmt(r.cheque)}</td>
                      <td>₹{fmt(r.saleValue)}</td>
                      <td>₹{fmt(r.received)}</td>
                      <td>₹{fmt(r.custOutstanding)}</td>
                      <td>₹{fmt(r.grossComm)}</td>
                      <td>₹{fmt(r.paidComm)}</td>
                      <td>₹{fmt(r.commOutstanding)}</td>
                      <td>{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.data.length > 0 && (
              <div className="card-footer text-muted small">Showing 1–{data.data.length} of {data.data.length} records</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ExecutiveCommissionReport;