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
      <div className="dash-welcome-banner dash-animate">
        <h5 className="dash-welcome-title mb-0">
          This Month at a Glance <span className="fs-13 fw-normal opacity-75">(Click a card to view reports)</span>
        </h5>
      </div>
      <div className="row mb-4">
        <div className="col-md-3 col-6 mb-3">
          <Link to="/admin/reports/emi-collections" className="dash-stat-card dash-animate d-block">
            <div className="dash-stat-body">
              <div className="dash-stat-icon dash-grad-green">
                <iconify-icon icon="solar:wallet-money-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value">{inr(stats.emi_collected_this_month)}</p>
                <p className="dash-stat-label">EMI Collected</p>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-3 col-6 mb-3">
          <Link to="/admin/reports/commissions" className="dash-stat-card dash-animate d-block">
            <div className="dash-stat-body">
              <div className="dash-stat-icon dash-grad-blue">
                <iconify-icon icon="solar:graph-up-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value">{inr(stats.commission_distributed_this_month)}</p>
                <p className="dash-stat-label">Commission Paid</p>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-3 col-6 mb-3">
          <Link to="/admin/withdrawals?status=pending" className="dash-stat-card dash-animate d-block">
            <div className="dash-stat-body">
              <div className="dash-stat-icon dash-grad-amber">
                <iconify-icon icon="solar:clock-circle-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value">{stats.pending_withdrawals ?? 0}</p>
                <p className="dash-stat-label">Pending Withdrawals</p>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-3 col-6 mb-3">
          <Link to="/admin/reports/project-sales" className="dash-stat-card dash-animate d-block">
            <div className="dash-stat-body">
              <div className="dash-stat-icon dash-grad-orange">
                <iconify-icon icon="solar:bill-list-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value">{stats.new_bookings_this_month ?? 0}</p>
                <p className="dash-stat-label">New Bookings</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Property / platform statistics */}
      <div className="row">
        <div className="col-md-6 col-xl-3 mb-3">
          <div className="dash-stat-card dash-animate">
            <div className="dash-stat-body">
              <div className="dash-stat-icon dash-grad-blue">
                <iconify-icon icon="solar:home-2-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value">{stats.total_projects ?? 0}</p>
                <p className="dash-stat-label">Active Projects</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3 mb-3">
          <div className="dash-stat-card dash-animate">
            <div className="dash-stat-body">
              <div className="dash-stat-icon dash-grad-teal">
                <iconify-icon icon="solar:map-point-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value">{stats.total_plots ?? 0}</p>
                <p className="dash-stat-label">Total Plots</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3 mb-3">
          <div className="dash-stat-card dash-animate">
            <div className="dash-stat-body">
              <div className="dash-stat-icon dash-grad-amber">
                <iconify-icon icon="solar:layers-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value">{stats.booked_plots ?? 0}</p>
                <p className="dash-stat-label">Booked Plots</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3 mb-3">
          <div className="dash-stat-card dash-animate">
            <div className="dash-stat-body">
              <div className="dash-stat-icon dash-grad-green">
                <iconify-icon icon="solar:check-circle-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value">{stats.available_plots ?? 0}</p>
                <p className="dash-stat-label">Available Plots</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3 mb-3">
          <div className="dash-stat-card dash-animate">
            <div className="dash-stat-body">
              <div className="dash-stat-icon dash-grad-purple">
                <iconify-icon icon="solar:users-group-two-rounded-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value">{stats.total_customers ?? 0}</p>
                <p className="dash-stat-label">Active Customers</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3 mb-3">
          <div className="dash-hero-card dash-grad-green dash-animate">
            <div className="dash-stat-body">
              <div className="dash-hero-icon">
                <iconify-icon icon="solar:wallet-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value text-white">{num(stats.distributed_bv)}</p>
                <p className="dash-stat-label text-white opacity-75">Distributed BV</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3 mb-3">
          <div className="dash-hero-card dash-grad-blue dash-animate">
            <div className="dash-stat-body">
              <div className="dash-hero-icon">
                <iconify-icon icon="solar:safe-2-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value text-white">{num(stats.distributed_pv)}</p>
                <p className="dash-stat-label text-white opacity-75">Distributed PV</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3 mb-3">
          <div className="dash-hero-card dash-grad-red dash-animate">
            <div className="dash-stat-body">
              <div className="dash-hero-icon">
                <iconify-icon icon="solar:clock-circle-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value text-white">{stats.pending_withdrawals ?? 0}</p>
                <p className="dash-stat-label text-white opacity-75">Pending Withdrawals</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3 mb-3">
          <div className="dash-hero-card dash-grad-amber dash-animate">
            <div className="dash-stat-body">
              <div className="dash-hero-icon">
                <iconify-icon icon="solar:bill-list-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="dash-stat-value text-white">{stats.pending_bookings ?? 0}</p>
                <p className="dash-stat-label text-white opacity-75">Pending Bookings</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-4 mb-3">
          <div className="dash-hero-card dash-grad-green dash-animate" style={{ minHeight: "100%" }}>
            <div className="dash-stat-body">
              <div className="dash-hero-icon">
                <iconify-icon icon="solar:cash-out-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="text-white opacity-75 fw-semibold mb-1 fs-13">BV Paid Out (This Month)</p>
                <h3 className="mb-0 text-white fw-bold">{num(stats.total_bv_paid_out)}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-4 mb-3">
          <div className="dash-hero-card dash-grad-blue dash-animate" style={{ minHeight: "100%" }}>
            <div className="dash-stat-body">
              <div className="dash-hero-icon">
                <iconify-icon icon="solar:wad-of-money-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="text-white opacity-75 fw-semibold mb-1 fs-13">PV Paid Out (This Month)</p>
                <h3 className="mb-0 text-white fw-bold">{num(stats.total_pv_paid_out)}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-4 mb-3">
          <Link to="/admin/tickets?status=open" className="dash-hero-card dash-grad-amber dash-animate d-block" style={{ minHeight: "100%" }}>
            <div className="dash-stat-body">
              <div className="dash-hero-icon">
                <iconify-icon icon="solar:chat-round-dots-bold-duotone"></iconify-icon>
              </div>
              <div>
                <p className="text-white opacity-75 fw-semibold mb-1 fs-13">Open Support Tickets</p>
                <h3 className="mb-0 text-white fw-bold">{stats.open_tickets ?? 0}</h3>
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