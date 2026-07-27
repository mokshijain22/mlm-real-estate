import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/axios.js";

function EmiManagement() {
  const [searchParams] = useSearchParams();
  const isOverdue = searchParams.get("view") === "overdue";

  const [emis, setEmis] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    setStatus("");
    setDateFrom("");
    setDateTo("");
  }, [isOverdue]);

  useEffect(() => {
    const params = { page };
    if (status) params.status = status;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    const url = isOverdue ? "/admin/emis/overdue" : "/admin/emis";

    api
      .get(url, { params })
      .then((res) => {
        setEmis(res.data.data);
        setMeta(res.data.meta);
        if (res.data.dateFrom) setDateFrom((prev) => prev || res.data.dateFrom.slice(0, 10));
        if (res.data.dateTo) setDateTo((prev) => prev || res.data.dateTo.slice(0, 10));
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOverdue, status, dateFrom, dateTo, page]);

  const resetToPage1 = (setter) => (val) => {
    setPage(1);
    setter(val);
  };

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <h4 className="card-title mb-0">{isOverdue ? "Overdue EMIs" : "All Installments (EMIs)"}</h4>
        <div>
          <Link to="/admin/emis?view=overdue" className="btn btn-soft-danger btn-sm">
            View Overdue
          </Link>
          <Link to="/admin/emis" className="btn btn-light btn-sm ms-2">
            All EMIs
          </Link>
        </div>
      </div>

      <div className="card-body">
        <div className="row g-3 mb-4">
          {!isOverdue && (
            <div className="col-md-2">
              <label className="form-label small text-muted">Status</label>
              <select className="form-select" value={status} onChange={(e) => resetToPage1(setStatus)(e.target.value)}>
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          )}
          <div className="col-md-3">
            <label className="form-label small text-muted">Due Date Range</label>
            <div className="input-group">
              <input
                type="date"
                className="form-control"
                value={dateFrom}
                onChange={(e) => resetToPage1(setDateFrom)(e.target.value)}
              />
              <input
                type="date"
                className="form-control"
                value={dateTo}
                onChange={(e) => resetToPage1(setDateTo)(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-centered table-nowrap mb-0">
            <thead className="table-light">
              <tr>
                <th>Booking #</th>
                <th>Customer</th>
                <th>Plot</th>
                <th>EMI #</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!emis ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : emis.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No installments found
                  </td>
                </tr>
              ) : (
                emis.map((emi) => (
                  <tr key={emi._id}>
                    <td>
                      <Link to={`/admin/bookings/${emi.booking?._id}`} className="fw-bold">
                        {emi.booking?.bookingNumber}
                      </Link>
                    </td>
                    <td>{emi.booking?.customer?.name}</td>
                    <td>
                      {emi.booking?.plot?.plotNumber} ({emi.booking?.project?.name})
                    </td>
                    <td>Month {emi.emiNumber}</td>
                    <td>{new Date(emi.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td>₹ {Number(emi.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                      {emi.status === "paid" ? (
                        <span className="badge bg-success-subtle text-success">Paid</span>
                      ) : emi.status === "pending" ? (
                        <span className="badge bg-warning-subtle text-warning">Pending</span>
                      ) : emi.status === "overdue" ? (
                        <span className="badge bg-danger-subtle text-danger">Overdue</span>
                      ) : (
                        <span className="badge bg-light text-muted">Cancelled</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/admin/bookings/${emi.booking?._id}`} className="btn btn-soft-primary btn-sm">
                        View Booking
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && (
          <div className="mt-3 d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Page {meta.page} of {meta.lastPage || 1} ({meta.total} total)
            </span>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= meta.lastPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmiManagement;