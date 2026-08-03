import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import ExportButton from "../../components/shared/ExportButton.jsx";

function ExecutiveTdsReport() {
  const [rows, setRows] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const buildParams = () => {
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  };

  useEffect(() => {
    api
      .get("/admin/reports/executive-tds", { params: buildParams() })
      .then((res) => {
        setRows(res.data.data);
        setSummary(res.data.summary);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const getExportParams = () => {
    const params = { ...buildParams() };
    delete params.page;
    return params;
  };

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h3 className="mt-2 mb-4">Executive TDS Report</h3>
          <ExportButton url="/admin/reports/executive-tds/export" params={getExportParams()} title="Executive TDS Report" filenamePrefix="executive_tds" />
        </div>
      </div>

      {summary && (
        <div className="row row-cols-2 row-cols-md-4 g-3 mb-3">
          <div className="col">
            <div className="card bg-primary-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-primary-emphasis fw-semibold mb-1">Executives</p>
                <h4 className="fs-20 fw-bold text-primary mb-0">{summary.total_agents}</h4>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-info-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-info-emphasis fw-semibold mb-1">Gross Amount</p>
                <h4 className="fs-20 fw-bold text-info mb-0">₹{fmt(summary.total_gross)}</h4>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-danger-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-danger-emphasis fw-semibold mb-1">Total TDS Deducted</p>
                <h4 className="fs-20 fw-bold text-danger mb-0">₹{fmt(summary.total_tds)}</h4>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-success-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-success-emphasis fw-semibold mb-1">Net Paid</p>
                <h4 className="fs-20 fw-bold text-success mb-0">₹{fmt(summary.total_net)}</h4>
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
              <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">To Date</label>
              <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr><th>Executive</th><th>Email</th><th>Withdrawals</th><th>Gross</th><th>TDS Deducted</th><th>Net Paid</th></tr>
            </thead>
            <tbody>
              {rows && rows.length === 0 && (
                <tr><td colSpan="6" className="text-center text-muted py-4">No approved withdrawals in this range.</td></tr>
              )}
              {rows?.map((r, i) => (
                <tr key={i}>
                  <td>{r.agent?.name || "N/A"}</td>
                  <td>{r.agent?.email || "N/A"}</td>
                  <td>{r.withdrawal_count}</td>
                  <td>₹{fmt(r.total_gross)}</td>
                  <td className="text-danger">₹{fmt(r.total_tds)}</td>
                  <td className="text-success">₹{fmt(r.total_net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ExecutiveTdsReport;
