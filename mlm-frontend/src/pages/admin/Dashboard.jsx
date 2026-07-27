import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/admin/dashboard")
      .then((res) => setStats(res.data.stats || {}))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!stats) return <div className="text-center py-5">Loading...</div>;

  const inr = (n) =>
    "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      {/* This Month at a Glance */}
      <div className="row mb-4">
        <div className="col-12">
          <h5 className="mb-3">
            This Month at a Glance <span className="fs-14 fw-normal text-muted">(Click to view reports)</span>
          </h5>
        </div>
        <div className="col-md-3 col-6 mb-3 mb-md-0">
          <Link
            to="/admin/reports/emi-collections"
            className="card bg-success-subtle border-0 text-decoration-none h-100 hover-shadow transition-all"
          >
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h4 className="fs-20 fw-bold text-success mb-1">{inr(stats.emi_collected_this_month)}</h4>
                <p className="text-success-emphasis fw-semibold mb-0">EMI Collected</p>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-3 col-6 mb-3 mb-md-0">
          <Link
            to="/admin/reports/commissions"
            className="card bg-info-subtle border-0 text-decoration-none h-100 hover-shadow transition-all"
          >
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h4 className="fs-20 fw-bold text-info mb-1">{inr(stats.commission_distributed_this_month)}</h4>
                <p className="text-info-emphasis fw-semibold mb-0">Commission Paid</p>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-3 col-6">
          <Link
            to="/admin/withdrawals?status=pending"
            className="card bg-warning-subtle border-0 text-decoration-none h-100 hover-shadow transition-all"
          >
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h4 className="fs-20 fw-bold text-warning mb-1">{stats.pending_withdrawals ?? 0}</h4>
                <p className="text-warning-emphasis fw-semibold mb-0">Pending Withdrawals</p>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-3 col-6">
          <Link
            to="/admin/reports/project-sales"
            className="card bg-primary-subtle border-0 text-decoration-none h-100 hover-shadow transition-all"
          >
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h4 className="fs-20 fw-bold text-primary mb-1">{stats.new_bookings_this_month ?? 0}</h4>
                <p className="text-primary-emphasis fw-semibold mb-0">New Bookings</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Property / platform statistics */}
      <div className="row">
        <div className="col-md-6 col-xl-3">
          <div className="card bg-primary-subtle border-0">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="fs-22 fw-bold text-primary mb-1">{stats.total_projects ?? 0}</h4>
                  <p className="text-primary-emphasis fw-semibold mb-0">Active Projects</p>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-primary text-white rounded fs-24">
                    <iconify-icon icon="solar:home-2-bold-duotone"></iconify-icon>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card bg-info-subtle border-0">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="fs-22 fw-bold text-info mb-1">{stats.total_plots ?? 0}</h4>
                  <p className="text-info-emphasis fw-semibold mb-0">Total Plots</p>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-info text-white rounded fs-24">
                    <iconify-icon icon="solar:map-point-bold-duotone"></iconify-icon>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card bg-warning-subtle border-0">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="fs-22 fw-bold text-warning mb-1">{stats.booked_plots ?? 0}</h4>
                  <p className="text-warning-emphasis fw-semibold mb-0">Booked Plots</p>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-warning text-white rounded fs-24">
                    <iconify-icon icon="solar:layers-bold-duotone"></iconify-icon>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card bg-success-subtle border-0">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="fs-22 fw-bold text-success mb-1">{stats.available_plots ?? 0}</h4>
                  <p className="text-success-emphasis fw-semibold mb-0">Available Plots</p>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-success text-white rounded fs-24">
                    <iconify-icon icon="solar:check-circle-bold-duotone"></iconify-icon>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card border-0" style={{ background: "linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="fs-22 fw-bold mb-1" style={{ color: "#6d28d9" }}>
                    {stats.total_customers ?? 0}
                  </h4>
                  <p className="fw-semibold mb-0" style={{ color: "#7c3aed" }}>
                    Active Customers
                  </p>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title text-white rounded fs-24" style={{ background: "#7c3aed" }}>
                    <iconify-icon icon="solar:users-group-two-rounded-bold-duotone"></iconify-icon>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card bg-success border-0 text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="fs-22 fw-bold mb-1 text-white">{num(stats.distributed_bv)}</h4>
                  <p className="fw-semibold mb-0 opacity-75">Distributed BV</p>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-white bg-opacity-25 text-white rounded fs-24">
                    <iconify-icon icon="solar:wallet-bold-duotone"></iconify-icon>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card bg-info border-0 text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="fs-22 fw-bold mb-1 text-white">{num(stats.distributed_pv)}</h4>
                  <p className="fw-semibold mb-0 opacity-75">Distributed PV</p>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-white bg-opacity-25 text-white rounded fs-24">
                    <iconify-icon icon="solar:safe-2-bold-duotone"></iconify-icon>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card bg-danger border-0 text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="fs-22 fw-bold mb-1 text-white">{stats.pending_withdrawals ?? 0}</h4>
                  <p className="fw-semibold mb-0 opacity-75">Pending Withdrawals</p>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-white bg-opacity-25 text-white rounded fs-24">
                    <iconify-icon icon="solar:clock-circle-bold-duotone"></iconify-icon>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card bg-warning border-0 text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h4 className="fs-22 fw-bold mb-1 text-white">{stats.pending_bookings ?? 0}</h4>
                  <p className="fw-semibold mb-0 opacity-75">Pending Bookings</p>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-white bg-opacity-25 text-white rounded fs-24">
                    <iconify-icon icon="solar:bill-list-bold-duotone"></iconify-icon>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-4">
          <div
            className="card border-0 shadow-sm"
            style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
          >
            <div className="card-body text-white">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="text-white-50 fw-semibold mb-1">BV Paid Out (This Month)</p>
                  <h3 className="mb-0 text-white">{num(stats.total_bv_paid_out)}</h3>
                </div>
                <div className="avatar-md bg-white bg-opacity-25 rounded d-flex align-items-center justify-content-center">
                  <iconify-icon icon="solar:cash-out-bold-duotone" className="fs-32"></iconify-icon>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-4">
          <div
            className="card border-0 shadow-sm"
            style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" }}
          >
            <div className="card-body text-white">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="text-white-50 fw-semibold mb-1">PV Paid Out (This Month)</p>
                  <h3 className="mb-0 text-white">{num(stats.total_pv_paid_out)}</h3>
                </div>
                <div className="avatar-md bg-white bg-opacity-25 rounded d-flex align-items-center justify-content-center">
                  <iconify-icon icon="solar:wad-of-money-bold-duotone" className="fs-32"></iconify-icon>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-4">
          <Link
            to="/admin/tickets?status=open"
            className="card border-0 shadow-sm text-decoration-none h-100 hover-shadow transition-all"
            style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
          >
            <div className="card-body text-white">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="text-white-50 fw-semibold mb-1">Open Support Tickets</p>
                  <h3 className="mb-0 text-white">{stats.open_tickets ?? 0}</h3>
                </div>
                <div className="avatar-md bg-white bg-opacity-25 rounded d-flex align-items-center justify-content-center">
                  <iconify-icon icon="solar:chat-round-dots-bold-duotone" className="fs-32 text-white"></iconify-icon>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Plots Breakdown */}
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h4 className="header-title">Plots Status Summary</h4>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-4">
                  <p className="text-muted mb-1 text-truncate">Available</p>
                  <h4 className="fs-20 fw-bold mb-0 text-success">{stats.available_plots ?? 0}</h4>
                </div>
                <div className="col-4 border-start">
                  <p className="text-muted mb-1 text-truncate">Booked</p>
                  <h4 className="fs-20 fw-bold mb-0 text-warning">{stats.booked_plots ?? 0}</h4>
                </div>
                <div className="col-4 border-start">
                  <p className="text-muted mb-1 text-truncate">Sold</p>
                  <h4 className="fs-20 fw-bold mb-0 text-danger">{stats.sold_plots ?? 0}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 text-center d-flex align-items-center justify-content-center">
          <div className="card w-100">
            <div className="card-body">
              <h5 className="card-title">Property Management</h5>
              <p className="card-text">Quickly manage projects and plots from the sidebar.</p>
              <Link to="/admin/projects" className="btn btn-primary btn-sm">
                Manage Projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;