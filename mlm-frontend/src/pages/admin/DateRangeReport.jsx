import { useState } from "react";
import api from "../../api/axios.js";
import ExportButton from "../../components/shared/ExportButton.jsx";

const ALL_COLUMNS = [
  { key: "paidOn", label: "Paid On" },
  { key: "reference", label: "Reference" },
  { key: "client", label: "Client" },
  { key: "project", label: "Project" },
  { key: "plot", label: "Plot" },
  { key: "area", label: "Area" },
  { key: "purpose", label: "Purpose" },
  { key: "method", label: "Method" },
  { key: "bank", label: "Bank" },
  { key: "amount", label: "Amount" },
  { key: "note", label: "Note" },
];

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function lastOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function DateRangeReport() {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(lastOfMonth());
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [sortBy, setSortBy] = useState("paidOn");
  const [order, setOrder] = useState("asc");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visibleCols, setVisibleCols] = useState(ALL_COLUMNS.map((c) => c.key));
  const [showColsMenu, setShowColsMenu] = useState(false);

  useState(() => {
    api.get("/admin/projects").then((res) => setProjects(res.data.data || res.data)).catch(() => {});
  }, []);

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtCompact = (n) => {
    n = Number(n || 0);
    if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
    if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L";
    return "₹" + fmt(n);
  };
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

  const buildParams = () => {
    const params = { date_from: dateFrom, date_to: dateTo, sort_by: sortBy, order };
    if (projectId) params.project_id = projectId;
    return params;
  };

  const runReport = () => {
    if (!dateFrom || !dateTo) {
      setError("Please select both From and To dates.");
      return;
    }
    setError(null);
    setLoading(true);
    api
      .get("/admin/reports/date-range", { params: buildParams() })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  const getExportParams = () => buildParams();

  const toggleColumn = (key) => {
    setVisibleCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const cellValue = (t, key) => {
    if (key === "paidOn") return fmtDate(t.paidOn);
    if (key === "amount") return "₹" + fmt(t.amount);
    if (key === "purpose") return t.purpose;
    return t[key];
  };

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="row mb-3 no-print">
        <div className="col-12">
          <h3 className="mt-2 mb-1">Date Range Report</h3>
          <p className="text-muted small">All paid transactions across projects — default is the current month</p>
        </div>
      </div>

      <div className="card mb-3 no-print">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label">Sort By</label>
              <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="paidOn">Paid on</option>
                <option value="amount">Amount</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Order</label>
              <select className="form-select" value={order} onChange={(e) => setOrder(e.target.value)}>
                <option value="asc">Low → High / Oldest</option>
                <option value="desc">High → Low / Newest</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">From Date</label>
              <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">To Date</label>
              <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Project</label>
              <select className="form-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button type="button" className="btn btn-primary w-100" onClick={runReport} disabled={loading}>
                {loading ? "Loading..." : "Apply"}
              </button>
            </div>
          </div>

          <div className="d-flex gap-2 mt-3 position-relative flex-wrap">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setDateFrom(firstOfMonth()); setDateTo(lastOfMonth()); setProjectId(""); setSortBy("paidOn"); setOrder("asc"); }}>
              <iconify-icon icon="solar:restart-bold-duotone" className="me-1"></iconify-icon>
              Reset
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowColsMenu(!showColsMenu)}>
              <iconify-icon icon="solar:widget-4-bold-duotone" className="me-1"></iconify-icon>
              Columns ({visibleCols.length}/{ALL_COLUMNS.length})
            </button>
            {showColsMenu && (
              <div className="card position-absolute shadow" style={{ top: "110%", zIndex: 20, minWidth: 220 }}>
                <div className="card-body py-2">
                  {ALL_COLUMNS.map((c) => (
                    <div className="form-check" key={c.key}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={visibleCols.includes(c.key)}
                        onChange={() => toggleColumn(c.key)}
                        id={`col-${c.key}`}
                      />
                      <label className="form-check-label" htmlFor={`col-${c.key}`}>{c.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data && (
              <ExportButton
                url="/admin/reports/date-range/export"
                params={getExportParams()}
                title="Date Range Report"
                filenamePrefix="date_range_report"
                className="btn btn-sm btn-success"
                label="Export"
              />
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {data && (
        <>
          <div className="row row-cols-2 row-cols-md-5 g-3 mb-3">
            <div className="col">
              <div className="card bg-primary-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-primary-emphasis fw-semibold mb-1">Transactions</p>
                  <h4 className="fs-20 fw-bold text-primary mb-0">{data.summary.transactions_count}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-success-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-success-emphasis fw-semibold mb-1">Total Collected</p>
                  <h4 className="fs-20 fw-bold text-success mb-0">{fmtCompact(data.summary.total_collected)}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-info-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-info-emphasis fw-semibold mb-1">Cash Received</p>
                  <h4 className="fs-20 fw-bold text-info mb-0">{fmtCompact(data.summary.cash_received)}</h4>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-warning-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-warning-emphasis fw-semibold mb-1">Bank Transfer</p>
                  <h4 className="fs-20 fw-bold text-warning mb-0">{fmtCompact(data.summary.bank_transfer_received)}</h4>
                  <small className="text-muted">UPI / NEFT / card</small>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card bg-secondary-subtle border-0 h-100">
                <div className="card-body">
                  <p className="text-secondary-emphasis fw-semibold mb-1">Cheque</p>
                  <h4 className="fs-20 fw-bold text-secondary mb-0">{fmtCompact(data.summary.cheque_received)}</h4>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((c) => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.length === 0 && (
                    <tr><td colSpan={visibleCols.length} className="text-center text-muted py-4">No transactions in this range.</td></tr>
                  )}
                  {data.transactions.map((t, i) => (
                    <tr key={i}>
                      {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((c) => (
                        <td key={c.key}>{cellValue(t, c.key)}</td>
                      ))}
                    </tr>
                  ))}
                  {data.transactions.length > 0 && (
                    <tr className="fw-bold">
                      <td colSpan={visibleCols.length - (visibleCols.includes("amount") ? 1 : 0)}>Total</td>
                      {visibleCols.includes("amount") && <td>₹{fmt(data.summary.total_collected)}</td>}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {data.transactions.length > 0 && (
              <div className="card-footer text-muted small">Showing 1–{data.transactions.length} of {data.transactions.length} records</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DateRangeReport;
