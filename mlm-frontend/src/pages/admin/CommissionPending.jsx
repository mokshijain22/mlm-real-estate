import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function CommissionPending() {
  const [emis, setEmis] = useState(null);
  const [error, setError] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [retryResult, setRetryResult] = useState({});

  function load() {
    api
      .get("/admin/emis/commission-pending")
      .then((res) => setEmis(res.data.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }

  useEffect(() => {
    load();
  }, []);

  function labelFor(n) {
    if (n === -1) return "Down Payment";
    if (n < -1) return `Down Payment ${Math.abs(n)}`;
    if (n === 0) return "Booking Token";
    if (n === 99) return "Registry";
    return `EMI ${n}`;
  }

  async function retry(id) {
    setRetryingId(id);
    setRetryResult((r) => ({ ...r, [id]: null }));
    try {
      await api.post(`/admin/emis/${id}/retry-commission`);
      setRetryResult((r) => ({ ...r, [id]: { ok: true, message: "Credited successfully" } }));
      load();
    } catch (err) {
      setRetryResult((r) => ({ ...r, [id]: { ok: false, message: err.response?.data?.message || err.message } }));
    } finally {
      setRetryingId(null);
    }
  }

  const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white py-3">
        <h4 className="card-title mb-0">Commission Pending</h4>
        <p className="text-muted small mb-0 mt-1">
          Payments that were successfully recorded, but whose commission crediting failed (e.g. a brief database
          connection issue) and never got automatically retried. Use "Retry" to attempt crediting again.
        </p>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger">{error}</div>}
        {!emis ? (
          <div className="text-muted">Loading…</div>
        ) : emis.length === 0 ? (
          <div className="alert alert-success mb-0">
            <iconify-icon icon="solar:check-circle-bold" className="align-middle me-1"></iconify-icon>
            Nothing pending — every paid EMI has its commission credited.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-centered table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Booking #</th>
                  <th>Customer</th>
                  <th>Agent</th>
                  <th>Milestone</th>
                  <th>Amount</th>
                  <th>Paid Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {emis.map((e) => (
                  <tr key={e._id}>
                    <td>
                      {e.booking ? (
                        <Link to={`/admin/bookings/${e.booking._id}`} className="fw-bold">
                          {e.booking.bookingNumber}
                        </Link>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td>{e.booking?.customer?.name || "N/A"}</td>
                    <td>{e.booking?.agent?.name || "N/A"}</td>
                    <td>{labelFor(e.emiNumber)}</td>
                    <td className="fw-semibold">{fmt(e.amount)}</td>
                    <td>{e.paidDate ? new Date(e.paidDate).toLocaleDateString("en-IN") : "-"}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={retryingId === e._id}
                        onClick={() => retry(e._id)}
                      >
                        {retryingId === e._id ? "Retrying…" : "Retry"}
                      </button>
                      {retryResult[e._id] && (
                        <div className={`small mt-1 ${retryResult[e._id].ok ? "text-success" : "text-danger"}`}>
                          {retryResult[e._id].message}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CommissionPending;