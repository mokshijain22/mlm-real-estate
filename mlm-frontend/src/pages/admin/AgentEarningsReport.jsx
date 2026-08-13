import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import ExportButton from "../../components/shared/ExportButton.jsx";

function AgentEarningsReport() {
  const [agents, setAgents] = useState(null);
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [ranks, setRanks] = useState([]);
  const [error, setError] = useState(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rankId, setRankId] = useState("");
  const [minEarnings, setMinEarnings] = useState("");
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

  const buildParams = () => {
    const params = { page };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (rankId) params.rank_id = rankId;
    if (minEarnings) params.min_earnings = minEarnings;
    if (search.trim()) params.search = search.trim();
    return params;
  };

  useEffect(() => {
    api
      .get("/admin/reports/agent-earnings", { params: buildParams() })
      .then((res) => {
        setAgents(res.data.data);
        setMeta(res.data.meta);
        setSummary(res.data.summary);
        setRanks(res.data.ranks || []);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, rankId, minEarnings, search, page]);

  const resetToPage1 = (setter) => (val) => {
    setPage(1);
    setter(val);
  };

  const resetFilters = () => {
    setPage(1);
    setDateFrom("");
    setDateTo("");
    setRankId("");
    setMinEarnings("");
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

  const isPeriod = !!(dateFrom || dateTo);
  const periodLabel = isPeriod ? "Period" : "This Month";

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h3 className="mt-2 mb-4">Agent Earnings Report</h3>
          <ExportButton url="/admin/reports/agent-earnings/export" params={getExportParams()} title="Agent Earnings Report" filenamePrefix="agent_earnings" />
        </div>
      </div>

      {summary && (
        <div className="row">
          <div className="col-md-3 col-6">
            <div className="card bg-primary-subtle border-0">
              <div className="card-body">
                <p className="text-primary-emphasis fw-semibold mb-1">Top Earner (Online)</p>
                <h4
                  className="fs-18 fw-bold text-primary mb-0 text-truncate"
                  title={summary.top_earner_bv?.name || "N/A"}
                >
                  {summary.top_earner_bv?.name || "N/A"}
                  {summary.top_earner_bv && (
                    <span className="fs-14 fw-normal text-muted d-block mt-1">
                      {fmt(summary.top_earner_bv.total_bv_earned)} Online
                    </span>
                  )}
                </h4>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card bg-info-subtle border-0">
              <div className="card-body">
                <p className="text-info-emphasis fw-semibold mb-1">Top Earner (Cash)</p>
                <h4
                  className="fs-18 fw-bold text-info mb-0 text-truncate"
                  title={summary.top_earner_pv?.name || "N/A"}
                >
                  {summary.top_earner_pv?.name || "N/A"}
                  {summary.top_earner_pv && (
                    <span className="fs-14 fw-normal text-muted d-block mt-1">
                      {fmt(summary.top_earner_pv.total_pv_earned)} Cash
                    </span>
                  )}
                </h4>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card bg-success-subtle border-0">
              <div className="card-body">
                <p className="text-success-emphasis fw-semibold mb-1">Total Distributed ({periodLabel})</p>
                <h4 className="fs-20 fw-bold text-success mb-0">₹{fmt(summary.total_distributed_this_month)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card bg-warning-subtle border-0">
              <div className="card-body">
                <p className="text-warning-emphasis fw-semibold mb-1">Total Agents Earning</p>
                <h4 className="fs-20 fw-bold text-warning mb-0">{summary.total_agents_earning}</h4>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row mt-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row g-2 align-items-end border-bottom pb-3 mb-3">
                <div className="col-md-2">
                  <label className="form-label">Search</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Name, email, code..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Date Range (For 'This Month' metrics if supported)</label>
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
                <div className="col-md-3">
                  <label className="form-label">Rank</label>
                  <select className="form-select" value={rankId} onChange={(e) => resetToPage1(setRankId)(e.target.value)}>
                    <option value="">All Ranks</option>
                    {ranks.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} ({r.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Min Total Earnings (Online)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={minEarnings}
                    onChange={(e) => resetToPage1(setMinEarnings)(e.target.value)}
                    placeholder="e.g. 1000"
                  />
                </div>
                <div className="col-md-3">
                  <button type="button" className="btn btn-primary w-100 mb-1" onClick={() => setPage(1)}>
                    Apply Filters
                  </button>
                  <button type="button" className="btn btn-light w-100" onClick={resetFilters}>
                    Reset
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-centered table-nowrap table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Agent Name</th>
                      <th>Rank</th>
                      <th>Total Team</th>
                      <th>Total Online Earned</th>
                      <th>Total Cash Earned</th>
                      <th>{periodLabel} Online</th>
                      <th>{periodLabel} Cash</th>
                      <th>Total Bookings</th>
                      <th>Joined Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!agents ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4">
                          Loading...
                        </td>
                      </tr>
                    ) : agents.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4">
                          <div className="my-3">
                            <iconify-icon icon="solar:users-group-rounded-bold-duotone" className="text-muted fs-32"></iconify-icon>
                            <h5 className="mt-2">No agents found</h5>
                            <p className="text-muted">Try adjusting your filters.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      agents.map((a) => (
                        <tr key={a._id}>
                          <td>
                            <Link to={`/admin/agents/${a._id}`} className="fw-bold d-block">
                              {a.name}
                            </Link>
                            <span className="text-muted fs-12">{a.referralCode}</span>
                          </td>
                          <td>
                            {a.rank ? (
                              <span className="badge bg-light text-dark border">{a.rank.name}</span>
                            ) : (
                              <span className="text-muted">No Rank</span>
                            )}
                          </td>
                          <td>{a.totalTeamSize || 0}</td>
                          <td className="fw-bold text-success">{fmt(a.total_bv_earned)}</td>
                          <td className="fw-bold text-info">{fmt(a.total_pv_earned)}</td>
                          <td>{fmt(a.this_month_bv)}</td>
                          <td>{fmt(a.this_month_pv)}</td>
                          <td>{a.total_bookings || 0}</td>
                          <td>
                            {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
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
        </div>
      </div>
    </div>
  );
}

export default AgentEarningsReport;
