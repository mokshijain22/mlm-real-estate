import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { getStoredUser } from "../../utils/userHelpers.js";

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

const rankColorMap = {
  "B.EX": "secondary",
  "S.EX": "primary",
  MGR: "info",
  "S.MGR": "success",
  AD: "warning",
  SD: "danger",
};

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/agent/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="text-center py-5">Loading...</div>;

  const {
    kycStatus,
    rejectionReason,
    minimal,
    wallet = {},
    commissions = {},
    bookings = {},
    rank = {},
    team = {},
    referral = {},
    emis = {},
  } = data;

  const agentUser = getStoredUser({});
  const isMaxRank = !rank.nextRank;
  const currentColor = rankColorMap[rank.currentRank?.abbreviation] || "primary";
  const tp = team.teamPerLevel || {};
  const l4plus = (tp[4] || tp["4"] || 0) + (tp[5] || tp["5"] || 0) + (tp[6] || tp["6"] || 0) + (tp[7] || tp["7"] || 0);

  return (
    <>
      {(kycStatus === null || kycStatus === "pending") && (
        <div className="alert alert-warning border-0 shadow-sm mb-4" role="alert">
          <div className="d-flex align-items-center">
            <div className="avatar-sm bg-warning text-white rounded-circle me-3 d-flex align-items-center justify-content-center">
              <iconify-icon icon="solar:shield-warning-bold-duotone" className="fs-24"></iconify-icon>
            </div>
            <div className="flex-grow-1">
              <h4 className="alert-heading fs-18 fw-bold mb-1">KYC Verification Pending</h4>
              <p className="mb-0">
                Your KYC verification is currently pending. Please complete your profile to unlock all features and
                start earning commissions.
              </p>
            </div>
            <div className="ms-auto">
              <Link to="/agent/kyc" className="btn btn-warning fw-bold">
                Complete KYC NOW
              </Link>
            </div>
          </div>
        </div>
      )}

      {kycStatus === "rejected" && (
        <div className="alert alert-danger border-0 shadow-sm mb-4" role="alert">
          <div className="d-flex align-items-center">
            <div className="avatar-sm bg-danger text-white rounded-circle me-3 d-flex align-items-center justify-content-center">
              <iconify-icon icon="solar:danger-triangle-bold-duotone" className="fs-24"></iconify-icon>
            </div>
            <div className="flex-grow-1">
              <h4 className="alert-heading fs-18 fw-bold mb-1">KYC Verification Rejected</h4>
              <p className="mb-0">
                Your KYC was rejected. Reason: <strong>{rejectionReason}</strong>. Please update and resubmit.
              </p>
            </div>
            <div className="ms-auto">
              <Link to="/agent/kyc" className="btn btn-danger fw-bold">
                Update KYC
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="dash-welcome-banner dash-animate">
        <div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
          <div className="col-sm-8">
            <h3 className="dash-welcome-title">Welcome back, {agentUser.name || "Agent"}!</h3>
            <span className="badge bg-white bg-opacity-10 border border-white border-opacity-25 text-white fs-13 px-3 py-2">
              <iconify-icon icon="solar:medal-star-bold-duotone" className="align-middle me-1" style={{ color: "#ffb08a" }}></iconify-icon>
              {rank.currentRank?.name || "Agent"} ({rank.currentRank?.abbreviation || "B.EX"})
            </span>
          </div>
          <div className="col-sm-4 text-sm-end mt-3 mt-sm-0">
            <div className="dash-referral-chip d-inline-block">
              <span className="text-white-50 small d-block mb-1">Referral Code</span>
              <div className="d-flex align-items-center gap-2">
                <code className="fs-16 fw-bold" id="referralCode">
                  {referral.referralCode}
                </code>
                <button className="dash-copy-btn" onClick={() => copyToClipboard(referral.referralCode)} title="Copy Code">
                  <iconify-icon icon="solar:copy-bold-duotone" className="fs-16"></iconify-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!minimal && (
        <>
          {/* Top Stats Cards */}
          <div className="row">
            <div className="col-md-6 col-sm-6 mb-3">
              <div className="dash-stat-card dash-animate">
                <div className="dash-stat-body">
                  <div className="dash-stat-icon dash-grad-orange">
                    <iconify-icon icon="solar:wallet-bold-duotone"></iconify-icon>
                  </div>
                  <div className="flex-grow-1">
                    <p className="dash-stat-value">₹{Math.round(wallet.bvBalance).toLocaleString("en-IN")}</p>
                    <p className="dash-stat-label">Online Balance</p>
                  </div>
                </div>
                <div className="px-3 pb-3 d-flex align-items-center justify-content-between">
                  <span className="text-muted small">Total: ₹{Math.round(wallet.totalBvEarned).toLocaleString("en-IN")}</span>
                  <Link to="/agent/wallet" className="fw-semibold fs-12" style={{ color: "#ff7a45" }}>
                    Details
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-sm-6 mb-3">
              <div className="dash-stat-card dash-animate">
                <div className="dash-stat-body">
                  <div className="dash-stat-icon dash-grad-blue">
                    <iconify-icon icon="solar:safe-2-bold-duotone"></iconify-icon>
                  </div>
                  <div className="flex-grow-1">
                    <p className="dash-stat-value">₹{Math.round(wallet.pvBalance).toLocaleString("en-IN")}</p>
                    <p className="dash-stat-label">Cash Balance</p>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted small">Total: ₹{Math.round(wallet.totalPvEarned).toLocaleString("en-IN")}</span>
                    <Link to="/agent/wallet" className="fw-semibold fs-12" style={{ color: "#ff7a45" }}>
                      Details
                    </Link>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <span className="text-muted small">
                      <iconify-icon icon="solar:banknote-bold-duotone" className="fs-12 me-1"></iconify-icon>
                      Cash: ₹{Math.round(wallet.cashEarned || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-muted small">
                      <iconify-icon icon="solar:bill-check-bold-duotone" className="fs-12 me-1"></iconify-icon>
                      Cheque: ₹{Math.round(wallet.chequeEarned || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-sm-6 mb-3">
              <div className="dash-stat-card dash-animate">
                <div className="dash-stat-body">
                  <div className="dash-stat-icon dash-grad-green">
                    <iconify-icon icon="solar:graph-up-bold-duotone"></iconify-icon>
                  </div>
                  <div className="flex-grow-1">
                    <p className="dash-stat-value">
                      ₹{Math.round(commissions.thisMonthBv).toLocaleString("en-IN")} <small className="fs-12">Online</small>
                    </p>
                    <p className="dash-stat-label">This Month</p>
                  </div>
                </div>
                <div className="px-3 pb-3 d-flex align-items-center justify-content-between">
                  <span className="text-muted small">Cash: ₹{Math.round(commissions.thisMonthPv).toLocaleString("en-IN")}</span>
                  <span className="small fw-semibold" style={{ color: "#059669" }}>
                    <iconify-icon icon="solar:arrow-up-bold" className="fs-12"></iconify-icon> Active
                  </span>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-sm-6 mb-3">
              <div className="dash-stat-card dash-animate">
                <div className="dash-stat-body">
                  <div className="dash-stat-icon dash-grad-amber">
                    <iconify-icon icon="solar:file-text-bold-duotone"></iconify-icon>
                  </div>
                  <div className="flex-grow-1">
                    <p className="dash-stat-value">{bookings.totalBookings}</p>
                    <p className="dash-stat-label">My Bookings</p>
                  </div>
                </div>
                <div className="px-3 pb-3 d-flex align-items-center justify-content-between">
                  <span className="text-muted small">
                    {bookings.activeBookings} Active | {bookings.pendingBookings} Pending
                  </span>
                  <Link to="/agent/bookings" className="fw-semibold fs-12" style={{ color: "#ff7a45" }}>
                    View All
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Rank Progress */}
          <div className="row">
            <div className="col-12">
              <div className="card border-0 shadow-sm overflow-hidden">
                <div className="card-header bg-white border-bottom py-3">
                  <h4 className="card-title mb-0">Rank Achievement Progress</h4>
                </div>
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-lg-4 text-center border-end">
                      <div className="py-3">
                        <div className="avatar-xl mx-auto mb-3">
                          <div className={`avatar-title bg-${currentColor}-subtle text-${currentColor} rounded-circle fs-60 shadow-sm`}>
                            <iconify-icon icon="solar:medal-ribbons-star-bold-duotone"></iconify-icon>
                          </div>
                        </div>
                        <h3 className="fw-bold mb-1">{rank.currentRank?.name}</h3>
                        <div className="d-flex justify-content-center gap-2 mb-3">
                          <span className={`badge bg-${currentColor}`}>{rank.currentRank?.bvPoints} BV/SF</span>
                          <span className={`badge bg-${currentColor}-subtle text-${currentColor}`}>
                            {rank.currentRank?.pvPoints} PV/SF
                          </span>
                        </div>
                        {isMaxRank && (
                          <div className="alert alert-success border-0 bg-success-subtle text-success py-2 px-3 fw-bold d-inline-block">
                            🏆 Maximum Rank Achieved - Sales Director
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-lg-8">
                      <div className="ps-lg-4 py-3">
                        {!isMaxRank ? (
                          <>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <h5 className="fw-bold mb-0">
                                Next Rank: <span className="text-primary">{rank.nextRank.name}</span>
                              </h5>
                              <span className="badge bg-primary-subtle text-primary">{rank.nextRank.abbreviation}</span>
                            </div>
                            <p className="text-muted small mb-4">
                              Complete following conditions to achieve your next rank promotion.
                            </p>

                            <div className="mb-4">
                              <div className="d-flex justify-content-between mb-2">
                                <span className="fw-medium">Group Sales (SQFT)</span>
                                <span className="fw-bold">
                                  {Math.round(rank.totalGroupSales)} / {Math.round(rank.nextRank.minGroupSales)}
                                </span>
                              </div>
                              <div className="progress progress-xl rounded-pill shadow-none bg-light" style={{ height: "10px" }}>
                                <div
                                  className={`progress-bar bg-${
                                    rank.sqftProgressPercent > 75
                                      ? "success"
                                      : rank.sqftProgressPercent > 50
                                      ? "warning"
                                      : "danger"
                                  } progress-bar-striped progress-bar-animated`}
                                  role="progressbar"
                                  style={{ width: `${rank.sqftProgressPercent}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="mb-2">
                              <div className="d-flex justify-content-between mb-2">
                                <span className="fw-medium">Verified Team Size</span>
                                <span className="fw-bold">
                                  {rank.totalTeamSize} / {rank.nextRank.minTeamSize}
                                </span>
                              </div>
                              <div className="progress progress-xl rounded-pill shadow-none bg-light" style={{ height: "10px" }}>
                                <div
                                  className={`progress-bar bg-${
                                    rank.teamProgressPercent > 75
                                      ? "success"
                                      : rank.teamProgressPercent > 50
                                      ? "warning"
                                      : "danger"
                                  } progress-bar-striped progress-bar-animated`}
                                  role="progressbar"
                                  style={{ width: `${rank.teamProgressPercent}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="mt-4 p-2 bg-light rounded text-center small border border-dashed border-secondary border-opacity-25">
                              <iconify-icon icon="solar:info-circle-line-duotone" className="align-middle me-1"></iconify-icon>
                              Note: <strong>Both</strong> conditions must be met to trigger an automatic rank upgrade.
                            </div>
                          </>
                        ) : (
                          <div className="h-100 d-flex flex-column justify-content-center text-center py-5">
                            <iconify-icon icon="solar:cup-star-bold-duotone" className="fs-60 text-warning mb-3"></iconify-icon>
                            <h4 className="fw-bold">Congratulations!</h4>
                            <p className="text-muted">
                              You have reached the elite rank of Sales Director. Keep up the great work and continue
                              to lead your team to success!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Bookings & Upcoming EMIs */}
          <div className="row">
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                  <h4 className="card-title mb-0 text-dark fw-bold">Recent Bookings</h4>
                  <Link to="/agent/bookings" className="btn btn-sm btn-soft-primary">
                    View All
                  </Link>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover table-nowrap align-middle mb-0">
                    <thead className="bg-light bg-opacity-50">
                      <tr>
                        <th className="ps-3 text-muted small">Booking#</th>
                        <th className="text-muted small">Customer</th>
                        <th className="text-muted small">Plot</th>
                        <th className="text-muted small">Amount</th>
                        <th className="text-muted small">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.recentBookings.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-4">
                            <div className="text-muted mb-3">No bookings found.</div>
                            <Link to="/agent/bookings/new" className="btn btn-sm btn-primary">
                              Create First Booking
                            </Link>
                          </td>
                        </tr>
                      ) : (
                        bookings.recentBookings.map((booking) => {
                          let badge = { color: "secondary", label: booking.status };
                          if (booking.approvalStatus === "pending") badge = { color: "warning", label: "Pending" };
                          else if (booking.approvalStatus === "rejected") badge = { color: "danger", label: "Rejected" };
                          else if (booking.status === "active") badge = { color: "success", label: "Active" };
                          else if (booking.status === "completed") badge = { color: "primary", label: "Completed" };
                          else badge.label = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);

                          return (
                            <tr key={booking._id}>
                              <td className="ps-3 fw-medium">#{booking.bookingNumber}</td>
                              <td>{(booking.customer?.name || "").slice(0, 15)}</td>
                              <td>
                                {booking.plot?.plotNumber} ({booking.project?.name})
                              </td>
                              <td className="fw-bold">₹{Math.round(booking.totalAmount).toLocaleString("en-IN")}</td>
                              <td>
                                <span className={`badge bg-${badge.color}-subtle text-${badge.color} border border-${badge.color} border-opacity-25`}>
                                  {badge.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-bottom py-3">
                  <h4 className="card-title mb-0 text-dark fw-bold">Upcoming EMIs</h4>
                </div>
                <div className="card-body p-0">
                  {emis.overdueEmis > 0 && (
                    <div className="alert alert-danger bg-danger-subtle border-0 rounded-0 m-0 py-2 px-3 small d-flex align-items-center">
                      <iconify-icon icon="solar:danger-bold-duotone" className="me-2 fs-18"></iconify-icon>
                      <span>
                        <strong>{emis.overdueEmis} EMI(s) are overdue.</strong> Please contact your customers immediately.
                      </span>
                    </div>
                  )}
                  <div className="table-responsive">
                    <table className="table table-hover table-nowrap align-middle mb-0">
                      <thead className="bg-light bg-opacity-50">
                        <tr>
                          <th className="ps-3 text-muted small">Booking#</th>
                          <th className="text-muted small">Customer</th>
                          <th className="text-muted small">Due Date</th>
                          <th className="text-muted small">Amount</th>
                          <th className="text-muted small">Urgency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emis.upcomingEmis.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center py-4 text-muted">
                              No upcoming EMIs for your bookings.
                            </td>
                          </tr>
                        ) : (
                          emis.upcomingEmis.map((emi) => {
                            const daysLeft = Math.floor(
                              (new Date(emi.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
                            );
                            const urgencyColor = daysLeft < 3 ? "danger" : daysLeft <= 7 ? "warning" : "info";
                            const urgencyLabel =
                              daysLeft < 0 ? "Overdue" : daysLeft === 0 ? "Due Today" : `${daysLeft} Days Left`;
                            return (
                              <tr key={emi._id}>
                                <td className="ps-3 fw-medium">#{emi.booking?.bookingNumber}</td>
                                <td>{(emi.booking?.customer?.name || "").slice(0, 15)}</td>
                                <td>
                                  {new Date(emi.dueDate).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </td>
                                <td className="fw-bold">₹{Math.round(emi.amount).toLocaleString("en-IN")}</td>
                                <td>
                                  <span className={`badge bg-${urgencyColor}-subtle text-${urgencyColor} border border-${urgencyColor} border-opacity-25`}>
                                    {urgencyLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Summary & Recent Commissions */}
          <div className="row">
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                  <h4 className="card-title mb-0 text-dark fw-bold">My Team</h4>
                  <Link to="/agent/team" className="btn btn-sm btn-soft-primary">
                    View Full Team
                  </Link>
                </div>
                <div className="card-body">
                  <div className="row text-center mb-4">
                    <div className="col-6 border-end">
                      <h4 className="fw-bold mb-1">{team.totalTeam}</h4>
                      <p className="text-muted small mb-0">Total Members</p>
                    </div>
                    <div className="col-6">
                      <h4 className="fw-bold mb-1 text-primary">{team.directReferrals}</h4>
                      <p className="text-muted small mb-0">Direct Referrals</p>
                    </div>
                  </div>

                  <h5 className="fs-14 fw-bold mb-3">Level-wise Breakdown</h5>
                  <div className="vstack gap-2 mb-4">
                    <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded shadow-none">
                      <span className="small fw-medium">
                        <span className="badge bg-primary me-2">L1</span> Level 1 (Directs)
                      </span>
                      <span className="fw-bold">{tp[1] || tp["1"] || 0}</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded shadow-none">
                      <span className="small fw-medium">
                        <span className="badge bg-info me-2">L2</span> Level 2
                      </span>
                      <span className="fw-bold">{tp[2] || tp["2"] || 0}</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded shadow-none">
                      <span className="small fw-medium">
                        <span className="badge bg-success me-2">L3</span> Level 3
                      </span>
                      <span className="fw-bold">{tp[3] || tp["3"] || 0}</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between p-2 bg-secondary bg-opacity-10 rounded shadow-none">
                      <span className="small fw-medium">
                        <span className="badge bg-secondary me-2">L4+</span> Levels 4 - 7
                      </span>
                      <span className="fw-bold">{l4plus}</span>
                    </div>
                  </div>

                  <div className="d-grid mt-4">
                    <button
                      className="btn btn-primary"
                      onClick={(e) => {
                        copyToClipboard(referral.referralLink);
                        const btn = e.currentTarget;
                        const original = btn.innerHTML;
                        btn.innerHTML = "Link Copied!";
                        setTimeout(() => {
                          btn.innerHTML = original;
                        }, 1500);
                      }}
                    >
                      <iconify-icon icon="solar:share-bold-duotone" className="align-middle me-1"></iconify-icon>
                      Invite New Member
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                  <h4 className="card-title mb-0 text-dark fw-bold">Recent Commissions</h4>
                  <Link to="/agent/wallet" className="btn btn-sm btn-soft-primary">
                    View All
                  </Link>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover table-nowrap align-middle mb-0">
                    <thead className="bg-light bg-opacity-50">
                      <tr>
                        <th className="ps-3 text-muted small">Date</th>
                        <th className="text-muted small">Type</th>
                        <th className="text-muted small">Amount</th>
                        <th className="text-muted small">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.recentCommissions.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-5">
                            <div className="avatar-sm bg-light flex-shrink-0 mx-auto mb-3">
                              <span className="avatar-title bg-transparent text-muted fs-24">
                                <iconify-icon icon="solar:empty-box-bold-duotone"></iconify-icon>
                              </span>
                            </div>
                            <div className="text-muted mb-0">No commissions yet.</div>
                            <p className="small text-muted">Start selling to earn commissions!</p>
                          </td>
                        </tr>
                      ) : (
                        commissions.recentCommissions.map((comm) => {
                          let catBadge = (
                            <span className="badge badge-soft-secondary">
                              {String(comm.category || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                            </span>
                          );
                          if (comm.category === "emi_commission")
                            catBadge = <span className="badge badge-soft-primary">EMI</span>;
                          else if (comm.category === "rank_difference")
                            catBadge = <span className="badge badge-soft-success">Rank Diff</span>;

                          return (
                            <tr key={comm._id}>
                              <td className="ps-3 text-muted small">
                                {new Date(comm.createdAt).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td>{catBadge}</td>
                              <td className="fw-bold text-success">+{Number(comm.amount).toFixed(2)}</td>
                              <td>
                                <span
                                  className={`badge border ${
                                    comm.pointsType === "BV" ? "border-primary text-primary" : "border-info text-info"
                                  }`}
                                >
                                  {comm.pointsType === "BV" ? "Online" : "Cash"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="row">
            <div className="col-12 mb-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body p-3">
                  <div className="row g-2">
                    <div className="col">
                      <Link
                        to="/agent/customers"
                        className="btn btn-outline-primary w-100 py-3 d-flex flex-column align-items-center gap-1 border-dashed"
                      >
                        <iconify-icon icon="solar:user-plus-bold-duotone" className="fs-24"></iconify-icon>
                        <span className="fs-12 fw-bold">Add Customer</span>
                      </Link>
                    </div>
                    <div className="col">
                      <Link
                        to="/agent/bookings/new"
                        className="btn btn-outline-success w-100 py-3 d-flex flex-column align-items-center gap-1 border-dashed"
                      >
                        <iconify-icon icon="solar:document-add-bold-duotone" className="fs-24"></iconify-icon>
                        <span className="fs-12 fw-bold">New Booking</span>
                      </Link>
                    </div>
                    <div className="col">
                      <Link
                        to="/agent/wallet"
                        className="btn btn-outline-info w-100 py-3 d-flex flex-column align-items-center gap-1 border-dashed"
                      >
                        <iconify-icon icon="solar:wallet-2-bold-duotone" className="fs-24"></iconify-icon>
                        <span className="fs-12 fw-bold">My Wallet</span>
                      </Link>
                    </div>
                    <div className="col">
                      <Link
                        to="/agent/team"
                        className="btn btn-outline-primary w-100 py-3 d-flex flex-column align-items-center gap-1 border-dashed"
                      >
                        <iconify-icon icon="solar:users-group-two-rounded-bold-duotone" className="fs-24"></iconify-icon>
                        <span className="fs-12 fw-bold">My Team</span>
                      </Link>
                    </div>
                    <div className="col">
                      <Link
                        to="/agent/wallet"
                        className="btn btn-outline-warning w-100 py-3 d-flex flex-column align-items-center gap-1 border-dashed"
                      >
                        <iconify-icon icon="solar:calculator-minimalistic-bold-duotone" className="fs-24"></iconify-icon>
                        <span className="fs-12 fw-bold">Commissions</span>
                      </Link>
                    </div>
                    <div className="col">
                      <Link
                        to="/agent/tickets"
                        className="btn btn-outline-secondary w-100 py-3 d-flex flex-column align-items-center gap-1 border-dashed"
                      >
                        <iconify-icon icon="solar:chat-round-dots-bold-duotone" className="fs-24"></iconify-icon>
                        <span className="fs-12 fw-bold">Support</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Referral Section */}
          <div className="row">
            <div className="col-12">
              <div className="card border-0 shadow-sm overflow-hidden mb-0">
                <div className="row g-0">
                  <div className="col-lg-7">
                    <div className="card-body p-4">
                      <h4 className="fw-bold text-dark mb-1">Your Referral Link</h4>
                      <p className="text-muted mb-4 small">
                        Invite your network and build your downline to earn more through rank differences and team
                        bonuses.
                      </p>

                      <div className="input-group mb-2">
                        <input
                          type="text"
                          className="form-control border-primary border-dashed bg-primary-subtle bg-opacity-10 py-2 fw-medium"
                          id="referralLinkInput"
                          value={referral.referralLink}
                          readOnly
                        />
                        <button className="btn btn-primary px-4" onClick={() => copyToClipboard(referral.referralLink)}>
                          <iconify-icon icon="solar:copy-bold-duotone" className="align-middle me-1"></iconify-icon> Copy
                        </button>
                      </div>
                      <p className="text-primary small mb-0 fw-medium">
                        <iconify-icon icon="solar:magic-stick-3-bold-duotone" className="align-middle me-1"></iconify-icon>
                        Tip: Share this link on WhatsApp or Facebook to reach more people!
                      </p>
                    </div>
                  </div>
                  <div className="col-lg-5 bg-primary bg-opacity-10 border-start border-white border-4">
                    <div className="card-body p-4">
                      <div className="row g-3">
                        <div className="col-6">
                          <p className="text-muted small mb-1">Direct Referrals</p>
                          <h3 className="fw-bold text-primary mb-0">{team.directReferrals}</h3>
                        </div>
                        <div className="col-6 text-end">
                          <p className="text-muted small mb-1">Your Code</p>
                          <h3 className="fw-bold text-dark mb-0">{referral.referralCode}</h3>
                        </div>
                        <div className="col-12 pt-3 border-top border-white">
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted small">Total Team Size</span>
                            <span className="badge bg-white text-primary border border-primary border-opacity-25 fs-13 px-2">
                              {team.totalTeam}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default Dashboard;