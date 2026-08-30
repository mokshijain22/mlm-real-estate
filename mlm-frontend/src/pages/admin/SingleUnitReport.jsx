import { useState } from "react";
import api from "../../api/axios.js";

function SingleUnitReport() {
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

  const handleSearchChange = (val) => {
    setSearchInput(val);
    if (!val.trim()) { setSuggestions([]); return; }
    api.get("/admin/reports/single-unit/search", { params: { query: val } })
      .then((res) => setSuggestions(res.data))
      .catch(() => {});
  };

  const selectPlot = (plot) => {
    setSuggestions([]);
    setSearchInput(`${plot.plotNumber} — ${plot.project?.name || ""}`);
    setError(null);
    setLoading(true);
    api
      .get("/admin/reports/single-unit", { params: { plot_id: plot._id } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <h3 className="mt-2 mb-4">Single Unit Report</h3>

      <div className="card mb-3">
        <div className="card-body position-relative">
          <label className="form-label">Search Plot by Number</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. A-101"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {suggestions.length > 0 && (
            <div className="list-group position-absolute w-100" style={{ zIndex: 10, maxWidth: "calc(100% - 3rem)" }}>
              {suggestions.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  className="list-group-item list-group-item-action"
                  onClick={() => selectPlot(p)}
                >
                  {p.plotNumber} — {p.project?.name || "N/A"} <span className="badge bg-secondary-subtle text-secondary ms-2">{p.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && <div className="text-muted">Loading...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {data && (
        <>
          <div className="card mb-3">
            <div className="card-header"><h5 className="card-title mb-0">Plot Details</h5></div>
            <div className="card-body row g-3">
              <div className="col-md-3"><small className="text-muted d-block">Plot Number</small><strong>{data.plot.plotNumber}</strong></div>
              <div className="col-md-3"><small className="text-muted d-block">Project</small><strong>{data.plot.project?.name || "N/A"}</strong></div>
              <div className="col-md-3"><small className="text-muted d-block">Total Area</small><strong>{data.plot.totalArea} sqft</strong></div>
              <div className="col-md-3"><small className="text-muted d-block">Status</small><strong>{data.plot.status}</strong></div>
              <div className="col-md-3"><small className="text-muted d-block">Price / sqft</small><strong>₹{fmt(data.plot.pricePerSqft)}</strong></div>
              <div className="col-md-3"><small className="text-muted d-block">Facing</small><strong>{data.plot.facing || "-"}</strong></div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header"><h5 className="card-title mb-0">Booking History</h5></div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr><th>Booking #</th><th>Customer</th><th>Agent</th><th>Total Amount</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {data.bookings.length === 0 && (
                    <tr><td colSpan="6" className="text-center text-muted py-4">No bookings for this plot.</td></tr>
                  )}
                  {data.bookings.map((b) => (
                    <tr key={b._id}>
                      <td>{b.bookingNumber}</td>
                      <td>{b.customer?.name || "N/A"}</td>
                      <td>{b.agent?.name || "N/A"}</td>
                      <td>₹{fmt(b.totalAmount)}</td>
                      <td>{b.status}</td>
                      <td>{fmtDate(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header"><h5 className="card-title mb-0">EMI Schedule</h5></div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr><th>Milestone</th><th>Amount</th><th>Due Date</th><th>Paid Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {data.emis.length === 0 && (
                    <tr><td colSpan="5" className="text-center text-muted py-4">No EMIs found.</td></tr>
                  )}
                  {data.emis.map((e) => (
                    <tr key={e._id}>
                      <td>{e.emiNumber === -1 ? "Down Payment" : e.emiNumber < -1 ? `Down Payment ${Math.abs(e.emiNumber)}` : e.emiNumber === 0 ? "Booking Token" : e.emiNumber === 99 ? "Registry" : `EMI ${e.emiNumber}`}</td>
                      <td>₹{fmt(e.amount)}</td>
                      <td>{fmtDate(e.dueDate)}</td>
                      <td>{fmtDate(e.paidDate)}</td>
                      <td><span className={`badge bg-${e.status === "paid" ? "success" : e.status === "overdue" ? "danger" : "warning"}-subtle text-${e.status === "paid" ? "success" : e.status === "overdue" ? "danger" : "warning"}`}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Commission Trail</h5></div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr><th>Date</th><th>Agent</th><th>Type</th><th>Amount</th><th>Remark</th></tr>
                </thead>
                <tbody>
                  {data.commission_transactions.length === 0 && (
                    <tr><td colSpan="5" className="text-center text-muted py-4">No commission transactions found.</td></tr>
                  )}
                  {data.commission_transactions.map((t) => (
                    <tr key={t._id}>
                      <td>{fmtDate(t.createdAt)}</td>
                      <td>{t.agent?.name || "N/A"}</td>
                      <td>{t.pointsType}</td>
                      <td>₹{fmt(t.amount)}</td>
                      <td>{t.remark}</td>
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

export default SingleUnitReport;