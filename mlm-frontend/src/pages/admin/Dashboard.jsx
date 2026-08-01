import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import CountUp from "../../components/admin/charts/CountUp.jsx";
import DonutChart from "../../components/admin/charts/DonutChart.jsx";
import OverviewAreaChart from "../../components/admin/charts/OverviewAreaChart.jsx";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentWithdrawals, setRecentWithdrawals] = useState([]);
  const [monthlyOverview, setMonthlyOverview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/admin/dashboard")
      .then((res) => {
        setStats(res.data.stats || {});
        setRecentBookings(res.data.recentBookings || []);
        setRecentWithdrawals(res.data.recentWithdrawals || []);
        setMonthlyOverview(res.data.monthlyOverview || null);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!stats) return <div className="text-center py-5">Loading...</div>;

  const inr = (n) =>
    "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const inrShort = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const num = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—");

  const statusBadge = (status) => {
    const map = {
      approved: "success",
      pending: "warning",
      rejected: "danger",
      active: "success",
      completed: "success",
      cancelled: "danger",
    };
    const cls = map[status] || "secondary";
    return <span className={`badge bg-${cls}-subtle text-${cls}`}>{status || "—"}</span>;
  };

  const plotsTotal = stats.total_plots ?? 0;
  const donutSegments = [
    { label: "Available", value: stats.available_plots ?? 0, color: "#34d399" },
    { label: "Booked", value: stats.booked_plots ?? 0, color: "#fbbf24" },
    { label: "Sold", value: stats.sold_plots ?? 0, color: "#f87171" },
  ];
  const pct = (v) => (plotsTotal > 0 ? Math.round(((v || 0) / plotsTotal) * 100) : 0);

  const todoItems = [
    { label: "Verify pending KYC documents", count: stats.pending_kyc ?? 0, to: "/admin/kyc" },
    { label: "Follow up on pending bookings", count: stats.pending_bookings ?? 0, to: "/admin/bookings/pending" },
    { label: "Process withdrawal requests", count: stats.pending_withdrawals ?? 0, to: "/admin/withdrawals?status=pending" },
  ];

  const quickActions = [
    { label: "Add New Project", icon: "solar:buildings-2-bold-duotone", to: "/admin/projects/create", grad: "dash-grad-blue" },
    { label: "Manage Plots", icon: "solar:map-point-bold-duotone", to: "/admin/projects", grad: "dash-grad-green" },
    { label: "New Booking", icon: "solar:bill-list-bold-duotone", to: "/admin/bookings/create", grad: "dash-grad-purple" },
    { label: "Pending Bookings", icon: "solar:clock-circle-bold-duotone", to: "/admin/bookings/pending", grad: "dash-grad-amber" },
    { label: "Manage Agents", icon: "solar:users-group-two-rounded-bold-duotone", to: "/admin/agents", grad: "dash-grad-teal" },
    { label: "View Reports", icon: "solar:chart-2-bold-duotone", to: "/admin/reports", grad: "dash-grad-red" },
  ];

  return (
    <>
      {/* Welcome header */}
      <div className="d-flex align-items-center justify-content-between mb-3 dash-animate">
        <div>
          <h4 className="mb-1 fw-bold">Welcome back, Admin 👋</h4>
          <p className="text-muted mb-0 fs-13">Here's what's happening with your business today.</p>
        </div>
      </div>

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
                <p className="dash-stat-value">
                  <CountUp value={stats.emi_collected_this_month} format={inr} />
                </p>
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
                <p className="dash-stat-value">
                  <CountUp value={stats.commission_distributed_this_month} format={inr} />
                </p>
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
                <p className="dash-stat-value">
                  <CountUp value={stats.pending_withdrawals ?? 0} />
                </p>
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
                <p className="dash-stat-value">
                  <CountUp value={stats.new_bookings_this_month ?? 0} />
                </p>
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

      {/* Charts row: Plots status donut + Monthly overview */}
      <div className="row">
        <div className="col-lg-4 mb-3">
          <div className="card dash-animate h-100">
            <div className="card-header">
              <h4 className="header-title">Plots Status Summary</h4>
            </div>
            <div className="card-body d-flex flex-column align-items-center">
              <DonutChart
                segments={donutSegments}
                centerLabel="Total Plots"
                centerValue={plotsTotal}
              />
              <div className="w-100 mt-3">
                {donutSegments.map((seg) => (
                  <div key={seg.label} className="d-flex align-items-center justify-content-between py-1">
                    <span className="d-flex align-items-center gap-2 fs-13 fw-semibold text-muted">
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: seg.color,
                          display: "inline-block",
                        }}
                      ></span>
                      {seg.label}
                    </span>
                    <span className="fs-13 fw-bold">
                      {seg.value} <span className="text-muted fw-normal">({pct(seg.value)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8 mb-3">
          <div className="card dash-animate h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h4 className="header-title mb-0">Monthly Overview</h4>
              <div className="d-flex gap-3 fs-12 fw-semibold">
                <span className="d-flex align-items-center gap-1">
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", display: "inline-block" }}></span>
                  EMI Collected
                </span>
                <span className="d-flex align-items-center gap-1">
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb", display: "inline-block" }}></span>
                  Commission Paid
                </span>
              </div>
            </div>
            <div className="card-body">
              {monthlyOverview ? (
                <OverviewAreaChart
                  labels={monthlyOverview.labels}
                  series={[
                    { name: "EMI Collected", color: "#34d399", data: monthlyOverview.emiCollected },
                    { name: "Commission Paid", color: "#2563eb", data: monthlyOverview.commissionPaid },
                  ]}
                />
              ) : (
                <div className="text-center text-muted py-5">Loading chart…</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions + To Do */}
      <div className="row">
        <div className="col-lg-8 mb-3">
          <div className="card dash-animate h-100">
            <div className="card-header">
              <h4 className="header-title">Quick Actions</h4>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {quickActions.map((qa) => (
                  <div className="col-6 col-md-4" key={qa.label}>
                    <Link to={qa.to} className="dash-quick-action d-block text-decoration-none">
                      <div className={`dash-quick-action-icon ${qa.grad}`}>
                        <iconify-icon icon={qa.icon}></iconify-icon>
                      </div>
                      <span className="dash-quick-action-label">{qa.label}</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-3">
          <div className="card dash-animate h-100">
            <div className="card-header">
              <h4 className="header-title">To Do List</h4>
            </div>
            <div className="card-body">
              {todoItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="dash-todo-item d-flex align-items-center justify-content-between text-decoration-none"
                >
                  <span className="d-flex align-items-center gap-2">
                    <span className="dash-todo-check"></span>
                    <span className="fs-13 fw-semibold text-body">{item.label}</span>
                  </span>
                  {item.count > 0 ? (
                    <span className="badge bg-danger-subtle text-danger rounded-pill">{item.count}</span>
                  ) : (
                    <span className="badge bg-success-subtle text-success rounded-pill">0</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings + Recent Withdrawals */}
      <div className="row">
        <div className="col-lg-6 mb-3">
          <div className="card dash-animate h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h4 className="header-title mb-0">Recent Bookings</h4>
              <Link to="/admin/bookings" className="fs-12 fw-semibold">
                View All
              </Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Project</th>
                      <th>Plot</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          No recent bookings found.
                        </td>
                      </tr>
                    ) : (
                      recentBookings.map((b) => (
                        <tr key={b.id}>
                          <td className="fw-semibold">{b.customer}</td>
                          <td>{b.project}</td>
                          <td>{b.plot}</td>
                          <td>{inrShort(b.amount)}</td>
                          <td>{fmtDate(b.date)}</td>
                          <td>{statusBadge(b.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6 mb-3">
          <div className="card dash-animate h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h4 className="header-title mb-0">Recent Withdrawals</h4>
              <Link to="/admin/withdrawals" className="fs-12 fw-semibold">
                View All
              </Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Amount</th>
                      <th>Requested On</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentWithdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          No withdrawal requests found.
                        </td>
                      </tr>
                    ) : (
                      recentWithdrawals.map((w) => (
                        <tr key={w.id}>
                          <td className="fw-semibold">{w.agent}</td>
                          <td>{inrShort(w.amount)}</td>
                          <td>{fmtDate(w.requestedOn)}</td>
                          <td>{statusBadge(w.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;