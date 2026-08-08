import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import ExportButton from "../../components/shared/ExportButton.jsx";

function CommissionsReport() {
  const [transactions, setTransactions] = useState(null);
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [agents, setAgents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [agentId, setAgentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("all");
  const [paymentType, setPaymentType] = useState("all");
  const [pointsType, setPointsType] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    api
      .get("/admin/agents")
      .then((res) => setAgents(res.data.data || res.data))
      .catch(() => {});
    api
      .get("/admin/projects")
      .then((res) => setProjects(res.data.data || res.data))
      .catch(() => {});
  }, []);

  const buildParams = () => {
    const params = { page };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (agentId) params.agent_id = agentId;
    if (projectId) params.project_id = projectId;
    if (category !== "all") params.category = category;
    if (paymentType !== "all") params.payment_type = paymentType;
    if (pointsType !== "all") params.points_type = pointsType;
    if (search.trim()) params.search = search.trim();
    return params;
  };

  useEffect(() => {
    api
      .get("/admin/reports/commissions", { params: buildParams() })
      .then((res) => {
        setTransactions(res.data.data);
        setMeta(res.data.meta);
        setSummary(res.data.summary);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, agentId, projectId, category, paymentType, pointsType, search, page]);

  const resetToPage1 = (setter) => (val) => {
    setPage(1);
    setter(val);
  };

  const resetFilters = () => {
    setPage(1);
    setDateFrom("");
    setDateTo("");
    setAgentId("");
    setProjectId("");
    setCategory("all");
    setPaymentType("all");
    setPointsType("all");
    setSearchInput("");
    setSearch("");
  };

  const getExportParams = () => {
    const params = { ...buildParams() };
    delete params.page;
    return params;
  };

  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h3 className="mt-2 mb-4">Commissions Report</h3>
          <ExportButton url="/admin/reports/commissions/export" params={getExportParams()} title="Commissions Report" filenamePrefix="commissions" />
        </div>
      </div>

      {summary && (
        <div className="row">
          <div className="col-md-2 col-6">
            <div className="card bg-primary-subtle border-0">
              <div className="card-body">
                <p className="text-primary-emphasis fw-semibold mb-1">Total Online Dist.</p>
                <h4 className="fs-20 fw-bold text-primary mb-0">{fmt(summary.total_bv)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div className="card bg-info-subtle border-0">
              <div className="card-body">
                <p className="text-info-emphasis fw-semibold mb-1">Total Cash Dist.</p>
                <h4 className="fs-20 fw-bold text-info mb-0">{fmt(summary.total_pv)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card bg-success-subtle border-0">
              <div className="card-body">
                <p className="text-success-emphasis fw-semibold mb-1">EMI Commissions</p>
                <h4 className="fs-20 fw-bold text-success mb-0">₹{fmt(summary.emi_commissions)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card bg-warning-subtle border-0">
              <div className="card-body">
                <p className="text-warning-emphasis fw-semibold mb-1">Rank Difference</p>
                <h4 className="fs-20 fw-bold text-warning mb-0">₹{fmt(summary.rank_difference)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-12">
            <div className="card bg-secondary-subtle border-0">
              <div className="card-body">
                <p className="text-secondary-emphasis fw-semibold mb-1">Agents Earning</p>
                <h4 className="fs-20 fw-bold text-secondary mb-0">{summary.agents_earning}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-12">
            <div className="card bg-dark-subtle border-0">
              <div className="card-body">
                <p className="text-dark-emphasis fw-semibold mb-1">Company Share</p>
                <h4 className="fs-20 fw-bold text-dark mb-0">₹{fmt(summary.total_company_commission)}</h4>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row mt-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div
                className="row g-3 align-items-end p-4 mb-3"
                style={{ background: "linear-gradient(135deg, #1e3a8a, #3730a3)", borderRadius: "12px" }}
              >
                <div className="col-md-3">
                  <label className="form-label text-white-50 text-uppercase small fw-bold">Search</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Agent, Booking#..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label text-white-50 text-uppercase small fw-bold">Category</label>
                  <select className="form-select" value={category} onChange={(e) => resetToPage1(setCategory)(e.target.value)}>
                    <option value="all">All</option>
                    <option value="emi_commission">EMI Commission</option>
                    <option value="rank_difference">Rank Difference</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label text-white-50 text-uppercase small fw-bold">Agent</label>
                  <select className="form-select" value={agentId} onChange={(e) => resetToPage1(setAgentId)(e.target.value)}>
                    <option value="">All Agents</option>
                    {agents.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} {a.referralCode ? `(${a.referralCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label text-white-50 text-uppercase small fw-bold">Project</label>
                  <select className="form-select" value={projectId} onChange={(e) => resetToPage1(setProjectId)(e.target.value)}>
                    <option value="">All Projects</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label text-white-50 text-uppercase small fw-bold">Date</label>
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
                <div className="col-md-2">
                  <label className="form-label text-white-50 text-uppercase small fw-bold">Payment Type</label>
                  <select className="form-select" value={paymentType} onChange={(e) => resetToPage1(setPaymentType)(e.target.value)}>
                    <option value="all">All</option>
                    <option value="token">Booking Token</option>
                    <option value="down_payment">Down Payment</option>
                    <option value="emi">EMI</option>
                    <option value="registry">Registry</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label text-white-50 text-uppercase small fw-bold">Points Type</label>
                  <select className="form-select" value={pointsType} onChange={(e) => resetToPage1(setPointsType)(e.target.value)}>
                    <option value="all">All</option>
                    <option value="BV">Online</option>
                    <option value="PV">Cash</option>
                  </select>
                </div>
                <div className="col-md-12 d-flex gap-2 justify-content-end">
                  <button type="button" className="btn btn-light" onClick={resetFilters}>
                    Reset
                  </button>
                  <button type="button" className="btn btn-warning fw-bold" onClick={() => setPage(1)}>
                    Apply Filters
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-centered table-nowrap table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Executive</th>
                      <th>Type</th>
                      <th>Project / Plot</th>
                      <th>Plot Area</th>
                      <th>Rate Value</th>
                      <th>Rate Type</th>
                      <th>Formatted Rate</th>
                      <th>Amount (INR)</th>
                      <th>Wallet</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!transactions ? (
                      <tr>
                        <td colSpan="10" className="text-center py-4">
                          Loading...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-4">
                          <div className="my-3">
                            <iconify-icon icon="solar:document-text-line-duotone" className="text-muted fs-32"></iconify-icon>
                            <h5 className="mt-2">No Commission Records</h5>
                            <p className="text-muted">Try adjusting your filters.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => {
                        const sqft = t.sqftPortion != null ? Number(t.sqftPortion) : Number(t.emi?.sqftPortion) || 0;
                        const rateValue = sqft > 0 ? Math.round((t.amount / sqft) * 100) / 100 : 0;
                        // Every row in this table is, by definition, already credited to
                        // the agent's wallet (commission rows only exist once their linked
                        // EMI is paid) — so a status badge here can never show anything but
                        // "credited" and carries no real information. Whether it's later
                        // been withdrawn to the agent's bank is tracked separately on the
                        // Withdrawals page, not per-transaction here.
                        return (
                          <tr key={t._id} className={t.isCompany ? "table-dark bg-opacity-10" : ""}>
                            <td>
                              <span className="fw-bold">
                                {t.isCompany ? (t.agent?.name || "Company") : `${t.agent?.name || "N/A"}${t.agent?.referralCode ? `(${t.agent.referralCode})` : ""}`}
                              </span>
                            </td>
                            <td>
                              {(() => {
                                const n = t.emi?.emiNumber;
                                if (n === undefined || n === null) return <span className="text-muted">-</span>;
                                if (n === 0) return <span className="badge bg-info-subtle text-info">Booking Token</span>;
                                if (n < 0) return <span className="badge bg-warning-subtle text-warning">Down Payment</span>;
                                if (n === 99) return <span className="badge bg-dark-subtle text-dark">Registry</span>;
                                return <span className="badge bg-success-subtle text-success">EMI {n}</span>;
                              })()}
                            </td>
                            <td>
                              {t.booking ? (
                                <>
                                  <Link to={`/admin/bookings/${t.booking._id}`} className="fw-bold">
                                    {t.booking.project?.name || "N/A"}
                                  </Link>
                                  <br />
                                  <span className="text-muted fs-12">Plot {t.booking.plot?.plotNumber || "N/A"}</span>
                                </>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>{t.booking?.totalArea ? `${t.booking.totalArea} sq.ft` : "N/A"}</td>
                            <td>{rateValue}</td>
                            <td>Per Sq.Ft</td>
                            <td>₹{fmt(rateValue)}/sq.ft</td>
                            <td className="fw-bold">
                              {t.pointsType === "BV" ? (
                                <span className="text-success">{fmt(t.amount)}</span>
                              ) : (
                                <span className="text-info">{fmt(t.amount)}</span>
                              )}
                            </td>
                            <td className="text-muted small">In wallet</td>
                            <td>{new Date(t.createdAt).toLocaleDateString("en-IN")}</td>
                          </tr>
                        );
                      })
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
        </div>
      </div>
    </div>
  );
}

export default CommissionsReport;
