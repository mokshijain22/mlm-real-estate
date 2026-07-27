import { useEffect, useState } from "react";
import api from "../../api/axios.js";

const categoryLabel = {
  emi_commission: "EMI Commission",
  rank_difference: "Rank Difference",
  withdrawal: "Withdrawal",
  tds_deduction: "TDS Deduction",
};

function Commissions() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ category: "", points_type: "", date_from: "", date_to: "" });
  const [page, setPage] = useState(1);

  const load = () => {
    const params = { page, limit: 20 };
    if (filters.category) params.category = filters.category;
    if (filters.points_type) params.points_type = filters.points_type;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;

    api
      .get("/agent/commissions", { params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const resetFilters = () => {
    setFilters({ category: "", points_type: "", date_from: "", date_to: "" });
    setPage(1);
    setTimeout(load, 0);
  };

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!data) return <div className="text-center py-5">Loading...</div>;

  const { transactions, pagination, totalBvEarned, totalPvEarned } = data;

  return (
    <>
      <h4 className="fw-bold mb-1">My Commissions</h4>
      <p className="text-muted mb-4 fs-13">Track your earnings from bookings and EMIs.</p>

      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <span className="text-muted fs-13">Total BV Earned</span>
              <h2 className="fw-bold mb-0 text-success">+{totalBvEarned?.toLocaleString("en-IN")}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <span className="text-muted fs-13">Total PV Earned</span>
              <h2 className="fw-bold mb-0 text-success">+{totalPvEarned?.toLocaleString("en-IN")}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <form onSubmit={applyFilters} className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label fw-semibold fs-13">Category</label>
              <select
                className="form-select"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                <option value="">All</option>
                <option value="emi_commission">EMI Commission</option>
                <option value="rank_difference">Rank Difference</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold fs-13">Points</label>
              <select
                className="form-select"
                value={filters.points_type}
                onChange={(e) => setFilters({ ...filters, points_type: e.target.value })}
              >
                <option value="">All</option>
                <option value="BV">BV</option>
                <option value="PV">PV</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold fs-13">From</label>
              <input
                type="date"
                className="form-control"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold fs-13">To</label>
              <input
                type="date"
                className="form-control"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button type="submit" className="btn btn-primary fw-bold">Filter</button>
              <button type="button" className="btn btn-outline-secondary fw-bold" onClick={resetFilters}>
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-5 text-muted">No commission records found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Booking</th>
                    <th>Points</th>
                    <th>Amount</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t._id}>
                      <td>{new Date(t.createdAt).toLocaleDateString("en-IN")}</td>
                      <td>{categoryLabel[t.category] || t.category}</td>
                      <td>{t.booking?.bookingNumber || "—"}</td>
                      <td>{t.pointsType}</td>
                      <td className="text-success fw-semibold">+₹{t.amount?.toLocaleString("en-IN")}</td>
                      <td className="text-muted fs-13">{t.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {pagination.last_page > 1 && (
          <div className="card-footer bg-transparent d-flex justify-content-between align-items-center">
            <span className="text-muted fs-13">
              Page {pagination.current_page} of {pagination.last_page}
            </span>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= pagination.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Commissions;