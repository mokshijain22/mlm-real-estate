import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { getStoredUser } from "../../utils/userHelpers.js";

function ReportsOverview() {
  const adminUser = getStoredUser({});
  const isSuperAdmin = adminUser.role === "super_admin";
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/admin/reports")
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (n) => Number(n || 0).toLocaleString("en-IN");

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!stats) return <div>Loading...</div>;

  const links = [
    {
      to: "/admin/reports/emi-collections",
      title: "EMI Collections Report",
      icon: "solar:cash-out-bold-duotone",
      bg: "bg-primary",
    },
    {
      to: "/admin/reports/commissions",
      title: "Commission Report",
      icon: "solar:graph-up-bold-duotone",
      bg: "bg-success",
    },
    {
      to: "/admin/reports/agent-earnings",
      title: "Agent Earnings Report",
      icon: "solar:wad-of-money-bold-duotone",
      bg: "bg-info",
    },
    {
      to: "/admin/reports/project-sales",
      title: "Project Sales Report",
      icon: "solar:home-2-bold-duotone",
      bg: "bg-warning",
    },
    {
      to: "/admin/reports/payouts",
      title: "Payout Report",
      icon: "solar:banknote-bold-duotone",
      bg: "",
      style: { background: "#7c3aed" },
    },
    {
      to: "/admin/reports/booked-plots",
      title: "Booked Plots Report",
      icon: "solar:home-smile-bold-duotone",
      bg: "",
      style: { background: "#0ea5e9" },
    },
    {
      to: "/admin/reports/executive-commissions",
      title: "Executive Commission Report",
      icon: "solar:medal-ribbons-star-bold-duotone",
      bg: "",
      style: { background: "#f97316" },
    },
  ];

  return (
    <div>
      <div className="row mb-3">
        <div className="col-12">
          <h3 className="mt-2 mb-4">Finance & Reports</h3>
        </div>
      </div>

      <h5 className="mb-3">This Month Summary</h5>
      <div className="row row-cols-2 row-cols-md-3 row-cols-xl-3 g-3">
        <div className="col">
          <div className="card bg-success-subtle border-0 h-100">
            <div className="card-body">
              <p className="text-success-emphasis fw-semibold mb-1">EMI Collected</p>
              <h4 className="fs-18 fw-bold text-success mb-0">₹{fmt(stats.current_month.emi_collected)}</h4>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card border-0 h-100" style={{ background: "#f3e8ff" }}>
            <div className="card-body">
              <p className="fw-semibold mb-1" style={{ color: "#7e22ce" }}>
                Online Distributed
              </p>
              <h4 className="fs-18 fw-bold mb-0" style={{ color: "#6b21a8" }}>
                {fmt(stats.current_month.bv_distributed)}
              </h4>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card bg-info-subtle border-0 h-100">
            <div className="card-body">
              <p className="text-info-emphasis fw-semibold mb-1">Cash Distributed</p>
              <h4 className="fs-18 fw-bold text-info mb-0">{fmt(stats.current_month.pv_distributed)}</h4>
            </div>
          </div>
        </div>
        {isSuperAdmin && (
        <div className="col">
          <div className="card bg-primary-subtle border-0 h-100">
            <div className="card-body">
              <p className="text-primary-emphasis fw-semibold mb-1">Withdrawals Paid</p>
              <h4 className="fs-18 fw-bold text-primary mb-0">₹{fmt(stats.current_month.withdrawals_paid)}</h4>
            </div>
          </div>
        </div>
        )}
        <div className="col">
          <div className="card bg-warning-subtle border-0 h-100">
            <div className="card-body">
              <p className="text-warning-emphasis fw-semibold mb-1">New Bookings</p>
              <h4 className="fs-18 fw-bold text-warning mb-0">{fmtInt(stats.current_month.new_bookings)}</h4>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card bg-secondary border-0 text-white h-100">
            <div className="card-body">
              <p className="fw-semibold mb-1 text-white-50">New Agents</p>
              <h4 className="fs-18 fw-bold text-white mb-0">{fmtInt(stats.current_month.new_agents)}</h4>
            </div>
          </div>
        </div>
      </div>

      <h5 className="mt-4 mb-3">All Time Summary</h5>
      <div className="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-3">
        <div className="col">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <p className="text-muted fw-semibold mb-1">Total EMI Collected</p>
                <h4 className="fs-20 fw-bold mb-0">₹{fmt(stats.all_time.total_emi_collected)}</h4>
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <p className="text-muted fw-semibold mb-1">Total Commission</p>
                <h4 className="fs-20 fw-bold mb-0">₹{fmt(stats.all_time.total_commission_distributed)}</h4>
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <p className="text-muted fw-semibold mb-1">Total Plots Sold</p>
                <h4 className="fs-20 fw-bold mb-0">{fmtInt(stats.all_time.total_plots_sold)}</h4>
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <p className="text-muted fw-semibold mb-1">Active Agents</p>
                <h4 className="fs-20 fw-bold mb-0">{fmtInt(stats.all_time.total_active_agents)}</h4>
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <p className="text-muted fw-semibold mb-1">Total Customers</p>
                <h4 className="fs-20 fw-bold mb-0">{fmtInt(stats.all_time.total_customers)}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h5 className="mt-4 mb-3">Quick Report Links</h5>
      <div className="row">
        {links.map((l, i) => (
          <div className={`col-md-6 col-xl-4 text-center ${i >= 2 ? "mt-3" : ""} ${i === 2 ? "mt-xl-0" : ""}`} key={l.to}>
            <Link to={l.to} className="card border-0 shadow-sm text-decoration-none h-100">
              <div className="card-body d-flex align-items-center">
                <div className="avatar-sm flex-shrink-0 me-3">
                  <span className={`avatar-title ${l.bg} text-white rounded fs-24`} style={l.style}>
                    <iconify-icon icon={l.icon}></iconify-icon>
                  </span>
                </div>
                <div className="flex-grow-1 text-start">
                  <h5 className="fs-16 fw-semibold text-dark mb-0">{l.title} &rarr;</h5>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportsOverview;