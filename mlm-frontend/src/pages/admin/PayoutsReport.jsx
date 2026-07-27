import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function PayoutsReport() {
  const [payouts, setPayouts] = useState(null);
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [agentId, setAgentId] = useState("");
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
  }, []);

  const buildParams = () => {
    const params = { page };
    if (status !== "all") params.status = status;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (agentId) params.agent_id = agentId;
    if (pointsType !== "all") params.points_type = pointsType;
    if (search.trim()) params.search = search.trim();
    return params;
  };

  useEffect(() => {
    api
      .get("/admin/reports/payouts", { params: buildParams() })
      .then((res) => {
        setPayouts(res.data.data);
        setMeta(res.data.meta);
        setSummary(res.data.summary);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dateFrom, dateTo, agentId, pointsType, search, page]);

  const resetToPage1 = (setter) => (val) => {
    setPage(1);
    setter(val);
  };

  const goTab = (nextStatus) => {
    setPage(1);
    setStatus(nextStatus);
  };

  const resetFilters = () => {
    setPage(1);
    setDateFrom("");
    setDateTo("");
    setAgentId("");
    setPointsType("all");
    setSearchInput("");
    setSearch("");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { ...buildParams() };
      delete params.page;
      const res = await api.get("/admin/reports/payouts/export", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payouts_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Export failed: " + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDateTime = (d) =>
    d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h3 className="mt-2 mb-4">Payouts Report</h3>
          <button type="button" className="btn btn-success" onClick={handleExport} disabled={exporting}>
            <iconify-icon icon="solar:download-bold-duotone" className="me-1"></iconify-icon>
            {exporting ? "Exporting..." : "Export to CSV"}
          </button>
        </div>
      </div>

      {summary && (
        <div className="row">
          <div className="col-md col-6">
            <div className="card bg-success-subtle border-0">
              <div className="card-body">
                <p className="text-success-emphasis fw-semibold mb-1">Total Approved</p>
                <h4 className="fs-20 fw-bold text-success mb-0">₹{fmt(summary.approved_sum)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md col-6">
            <div className="card bg-danger-subtle border-0">
              <div className="card-body">
                <p className="text-danger-emphasis fw-semibold mb-1">TDS Deducted</p>
                <h4 className="fs-20 fw-bold text-danger mb-0">₹{fmt(summary.tds_deducted)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md col-6">
            <div className="card bg-primary-subtle border-0">
              <div className="card-body">
                <p className="text-primary-emphasis fw-semibold mb-1">Net Paid (Approved)</p>
                <h4 className="fs-20 fw-bold text-primary mb-0">₹{fmt(summary.approved_sum - summary.tds_deducted)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md col-6">
            <div className="card bg-warning-subtle border-0">
              <div className="card-body">
                <p className="text-warning-emphasis fw-semibold mb-1">Total Pending</p>
                <h4 className="fs-20 fw-bold text-warning mb-0">₹{fmt(summary.pending_sum)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md col-12">
            <div className="card bg-secondary-subtle border-0">
              <div className="card-body">
                <p className="text-secondary-emphasis fw-semibold mb-1">Total Rejected</p>
                <h4 className="fs-20 fw-bold text-secondary mb-0">₹{fmt(summary.rejected_sum)}</h4>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row mt-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <ul className="nav nav-tabs nav-bordered mb-3">
                <li className="nav-item">
                  <button className={`nav-link ${status === "all" ? "active" : ""}`} onClick={() => goTab("all")}>
                    All <span className="badge bg-primary ms-1">{summary?.requested_count ?? 0}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${status === "pending" ? "active" : ""}`} onClick={() => goTab("pending")}>
                    Pending <span className="badge bg-warning ms-1">{summary?.pending_count ?? 0}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${status === "approved" ? "active" : ""}`} onClick={() => goTab("approved")}>
                    Approved <span className="badge bg-success ms-1">{summary?.approved_count ?? 0}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${status === "rejected" ? "active" : ""}`} onClick={() => goTab("rejected")}>
                    Rejected <span className="badge bg-danger ms-1">{summary?.rejected_count ?? 0}</span>
                  </button>
                </li>
              </ul>

              <div className="row g-2 align-items-end border-bottom pb-3 mb-3">
                <div className="col-md-2">
                  <label className="form-label">Search</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Agent name..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Date Range</label>
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
                  <label className="form-label">Agent</label>
                  <select className="form-select" value={agentId} onChange={(e) => resetToPage1(setAgentId)(e.target.value)}>
                    <option value="">All Agents</option>
                    {agents.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} {a.referralCode ? `(${a.referralCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Points Type</label>
                  <select className="form-select" value={pointsType} onChange={(e) => resetToPage1(setPointsType)(e.target.value)}>
                    <option value="all">All Points</option>
                    <option value="BV">BV Payouts</option>
                    <option value="PV">PV Payouts</option>
                  </select>
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
                      <th>Request #</th>
                      <th>Agent</th>
                      <th>Rank</th>
                      <th>Type</th>
                      <th className="text-end">Requested Amount</th>
                      <th className="text-end">TDS</th>
                      <th className="text-end">Net Amount</th>
                      <th>Status</th>
                      <th>Requested Date</th>
                      <th>Approved Date</th>
                      <th>Payment Ref</th>
                      <th>Reviewed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!payouts ? (
                      <tr>
                        <td colSpan="12" className="text-center py-4">
                          Loading...
                        </td>
                      </tr>
                    ) : payouts.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="text-center py-4">
                          <div className="my-3">
                            <iconify-icon icon="solar:wallet-money-bold-duotone" className="text-muted fs-32"></iconify-icon>
                            <h5 className="mt-2">No payouts found</h5>
                            <p className="text-muted">Try adjusting your filters.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      payouts.map((p) => (
                        <tr key={p._id}>
                          <td>
                            <span className="fw-bold">REQ-{p._id.slice(-5).toUpperCase()}</span>
                          </td>
                          <td>
                            <Link to={`/admin/agents/${p.agent?._id}`} className="fw-bold d-block">
                              {p.agent?.name || "N/A"}
                            </Link>
                          </td>
                          <td>
                            {p.agent?.rank ? (
                              <span className="badge bg-light text-dark border">{p.agent.rank.abbreviation}</span>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge bg-${p.pointsType === "BV" ? "success" : "info"}`}>{p.pointsType}</span>
                          </td>
                          <td className="text-end text-muted">₹ {fmt(p.amount)}</td>
                          <td className="text-end text-danger">₹ {fmt(p.tdsAmount)}</td>
                          <td className="text-end fw-bold text-success">₹ {fmt(p.netAmount)}</td>
                          <td>
                            {p.status === "approved" ? (
                              <span className="badge bg-success-subtle text-success border border-success border-opacity-25">Approved</span>
                            ) : p.status === "pending" ? (
                              <span className="badge bg-warning-subtle text-warning border border-warning border-opacity-25">Pending</span>
                            ) : p.status === "rejected" ? (
                              <span className="badge bg-danger-subtle text-danger border border-danger border-opacity-25">Rejected</span>
                            ) : (
                              <span className="badge bg-light text-muted">{p.status}</span>
                            )}
                          </td>
                          <td>{fmtDateTime(p.requestedAt)}</td>
                          <td>{fmtDateTime(p.reviewedAt)}</td>
                          <td>{p.paymentReference || "-"}</td>
                          <td>{p.reviewedBy?.name || "-"}</td>
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

export default PayoutsReport;