import { useState } from "react";
import api from "../../api/axios.js";

function MonthEndReport() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const runReport = () => {
    setError(null);
    setLoading(true);
    api
      .get("/admin/reports/month-end", { params: { month } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <h3 className="mt-2 mb-4">Month-End Report</h3>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label">Select Month</label>
              <input type="month" className="form-control" value={month} onChange={(e) => setMonth(e.target.value)} />
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
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
          <div className="col">
            <div className="card bg-primary-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-primary-emphasis fw-semibold mb-1">New Bookings</p>
                <h4 className="fs-20 fw-bold text-primary mb-0">{data.new_bookings}</h4>
                <small className="text-muted">Value: ₹{fmt(data.new_booking_value)}</small>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-success-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-success-emphasis fw-semibold mb-1">EMI Collected This Month</p>
                <h4 className="fs-20 fw-bold text-success mb-0">₹{fmt(data.emi_collected_this_month)}</h4>
                <small className="text-muted">{data.emi_due_this_month} EMIs were due</small>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-danger-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-danger-emphasis fw-semibold mb-1">Overdue EMIs (at month end)</p>
                <h4 className="fs-20 fw-bold text-danger mb-0">{data.emi_overdue_at_month_end}</h4>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-info-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-info-emphasis fw-semibold mb-1">Commission Distributed</p>
                <h4 className="fs-20 fw-bold text-info mb-0">BV ₹{fmt(data.commission_bv)}</h4>
                <small className="text-muted">PV ₹{fmt(data.commission_pv)}</small>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-warning-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-warning-emphasis fw-semibold mb-1">Withdrawals Paid</p>
                <h4 className="fs-20 fw-bold text-warning mb-0">₹{fmt(data.withdrawals_paid)}</h4>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-secondary-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-secondary-emphasis fw-semibold mb-1">Plots Sold / Bookings Cancelled</p>
                <h4 className="fs-20 fw-bold text-secondary mb-0">{data.plots_sold} / {data.bookings_cancelled}</h4>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MonthEndReport;