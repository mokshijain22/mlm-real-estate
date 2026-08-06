import { useEffect, useState } from "react";
import api from "../../api/axios.js";

const categoryLabel = {
  emi_commission: "EMI Commission",
  rank_difference: "Rank Difference",
  withdrawal: "Withdrawal",
  tds_deduction: "TDS Deduction",
};

function Wallet() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ points_type: "BV", amount: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const load = () => {
    api
      .get("/agent/wallet")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const handleWithdraw = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setSuccessMsg(null);
    setError(null);

    api
      .post("/agent/wallet/withdraw", form)
      .then((res) => {
        setSuccessMsg(res.data.message);
        setForm({ points_type: "BV", amount: "" });
        load();
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setFieldErrors(err.response.data.errors);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setSubmitting(false));
  };

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!data) return <div className="text-center py-5">Loading...</div>;

  const { wallet, pendingRequests, recentTransactions, minWithdrawal, tdsPercent } = data;

  return (
    <>
      <h4 className="fw-bold mb-1">My Wallet</h4>
      <p className="text-muted mb-4 fs-13">Manage your Online/Cash balance and withdrawal requests.</p>

      {successMsg && <div className="alert alert-success border-0 shadow-sm">{successMsg}</div>}

      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <span className="text-muted fs-13">Online Balance</span>
              <h2 className="fw-bold mb-0">{wallet.bvBalance?.toLocaleString("en-IN")}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <span className="text-muted fs-13">Cash Balance</span>
              <h2 className="fw-bold mb-0">{wallet.pvBalance?.toLocaleString("en-IN")}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-5 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3">Request Withdrawal</h6>
              <p className="text-muted fs-13">
                Minimum withdrawal: ₹{minWithdrawal} &middot; TDS: {form.points_type === "BV" ? tdsPercent : 0}%
              </p>
              <form onSubmit={handleWithdraw}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Points Type</label>
                  <select
                    className={`form-select ${fieldErrors.points_type ? "is-invalid" : ""}`}
                    value={form.points_type}
                    onChange={(e) => setForm({ ...form, points_type: e.target.value })}
                  >
                    <option value="BV">Online</option>
                    <option value="PV">Cash</option>
                  </select>
                  {fieldErrors.points_type && <div className="invalid-feedback">{fieldErrors.points_type}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Amount</label>
                  <input
                    type="number"
                    className={`form-control ${fieldErrors.amount ? "is-invalid" : ""}`}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                  {fieldErrors.amount && <div className="invalid-feedback">{fieldErrors.amount}</div>}
                </div>
                <button type="submit" className="btn btn-primary fw-bold" disabled={submitting}>
                  {submitting ? "Submitting..." : "Request Withdrawal"}
                </button>
              </form>

              {pendingRequests.length > 0 && (
                <div className="mt-4">
                  <h6 className="fw-bold fs-13 text-muted mb-2">Pending Requests</h6>
                  {pendingRequests.map((r) => (
                    <div key={r._id} className="d-flex justify-content-between border-bottom py-2">
                      <span>
                        {r.pointsType} — ₹{r.amount?.toLocaleString("en-IN")}
                      </span>
                      <span className="badge bg-warning-subtle text-warning">Pending</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-7 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3">Recent Transactions</h6>
              {recentTransactions.length === 0 ? (
                <p className="text-muted mb-0">No transactions yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Points</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((t) => (
                        <tr key={t._id}>
                          <td>{new Date(t.createdAt).toLocaleDateString("en-IN")}</td>
                          <td>{categoryLabel[t.category] || t.category}</td>
                          <td>
                            <span className={`badge bg-${t.type === "credit" ? "success" : "danger"}-subtle text-${t.type === "credit" ? "success" : "danger"}`}>
                              {t.type}
                            </span>
                          </td>
                          <td>{t.pointsType}</td>
                          <td className={t.type === "credit" ? "text-success" : "text-danger"}>
                            {t.type === "credit" ? "+" : "-"}₹{t.amount?.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Wallet;