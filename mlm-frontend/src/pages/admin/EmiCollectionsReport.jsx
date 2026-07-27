import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function EmiCollectionsReport() {
  const [emis, setEmis] = useState(null);
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [projectId, setProjectId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentMode, setPaymentMode] = useState("all");
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
      .get("/admin/projects")
      .then((res) => setProjects(res.data.data || res.data))
      .catch(() => {});
    api
      .get("/admin/agents")
      .then((res) => setAgents(res.data.data || res.data))
      .catch(() => {});
  }, []);

  const buildParams = () => {
    const params = { page };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (projectId) params.project_id = projectId;
    if (agentId) params.agent_id = agentId;
    if (status !== "all") params.status = status;
    if (paymentMode !== "all") params.payment_mode = paymentMode;
    if (search.trim()) params.search = search.trim();
    return params;
  };

  useEffect(() => {
    api
      .get("/admin/reports/emi-collections", { params: buildParams() })
      .then((res) => {
        setEmis(res.data.data);
        setMeta(res.data.meta);
        setSummary(res.data.summary);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, projectId, agentId, status, paymentMode, search, page]);

  const resetToPage1 = (setter) => (val) => {
    setPage(1);
    setter(val);
  };

  const resetFilters = () => {
    setPage(1);
    setDateFrom("");
    setDateTo("");
    setProjectId("");
    setAgentId("");
    setStatus("all");
    setPaymentMode("all");
    setSearchInput("");
    setSearch("");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { ...buildParams() };
      delete params.page;
      const res = await api.get("/admin/reports/emi-collections/export", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `emi_collections_${Date.now()}.csv`);
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
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h3 className="mt-2 mb-4">EMI Collections Report</h3>
          <button type="button" className="btn btn-success" onClick={handleExport} disabled={exporting}>
            <iconify-icon icon="solar:download-bold-duotone" className="me-1"></iconify-icon>
            {exporting ? "Exporting..." : "Export to CSV"}
          </button>
        </div>
      </div>

      {summary && (
        <div className="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-3">
          <div className="col">
            <div className="card bg-primary-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-primary-emphasis fw-semibold mb-1">Total Collected</p>
                <h4 className="fs-20 fw-bold text-primary mb-0">₹{fmt(summary.total_collected)}</h4>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-success-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-success-emphasis fw-semibold mb-1">Cash</p>
                <h4 className="fs-20 fw-bold text-success mb-0">₹{fmt(summary.cash_collected)}</h4>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-info-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-info-emphasis fw-semibold mb-1">Online</p>
                <h4 className="fs-20 fw-bold text-info mb-0">₹{fmt(summary.online_collected)}</h4>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-warning-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-warning-emphasis fw-semibold mb-1">Pending Amount</p>
                <h4 className="fs-20 fw-bold text-warning mb-0">₹{fmt(summary.pending_amount)}</h4>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-danger-subtle border-0 h-100">
              <div className="card-body">
                <p className="text-danger-emphasis fw-semibold mb-1">Overdue Amount</p>
                <h4 className="fs-20 fw-bold text-danger mb-0">₹{fmt(summary.overdue_amount)}</h4>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row mt-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row g-2 align-items-end mb-2">
                <div className="col-md-3">
                  <label className="form-label">Search</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Customer, Booking#, Agent..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Date Range (Paid)</label>
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
                  <label className="form-label">Project</label>
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
              </div>

              <div className="row g-2 align-items-end border-bottom pb-3 mb-3">
                <div className="col-md-3">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={status} onChange={(e) => resetToPage1(setStatus)(e.target.value)}>
                    <option value="all">All</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Mode</label>
                  <select className="form-select" value={paymentMode} onChange={(e) => resetToPage1(setPaymentMode)(e.target.value)}>
                    <option value="all">All</option>
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <button type="button" className="btn btn-primary w-100" onClick={() => setPage(1)}>
                    Apply Filters
                  </button>
                </div>
                <div className="col-md-3">
                  <button type="button" className="btn btn-light w-100" onClick={resetFilters}>
                    Reset
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-centered table-nowrap table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>EMI # / Month</th>
                      <th>Booking #</th>
                      <th>Customer</th>
                      <th>Project / Plot</th>
                      <th>Agent</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Due Date</th>
                      <th>Paid Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!emis ? (
                      <tr>
                        <td colSpan="10" className="text-center py-4">
                          Loading...
                        </td>
                      </tr>
                    ) : emis.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-4">
                          <div className="my-3">
                            <iconify-icon icon="solar:document-text-line-duotone" className="text-muted fs-32"></iconify-icon>
                            <h5 className="mt-2">No EMI records found</h5>
                            <p className="text-muted">Try adjusting your filters.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      emis.map((emi) => (
                        <tr key={emi._id}>
                          <td>
                            <span className="fw-bold fs-14">#{emi._id.slice(-6)}</span>
                            <br />
                            <span className="text-muted">Month {emi.emiNumber}</span>
                          </td>
                          <td>
                            {emi.booking ? (
                              <Link to={`/admin/bookings/${emi.booking._id}`} className="fw-bold">
                                {emi.booking.bookingNumber}
                              </Link>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                          <td>{emi.booking?.customer?.name || "N/A"}</td>
                          <td>
                            {emi.booking && emi.booking.project && emi.booking.plot ? (
                              <>
                                <span className="d-block">{emi.booking.project.name}</span>
                                <span className="text-muted fs-12">Plot: {emi.booking.plot.plotNumber}</span>
                              </>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                          <td>{emi.booking?.agent?.name || <span className="text-muted">N/A</span>}</td>
                          <td className="fw-bold">₹ {fmt(emi.amount)}</td>
                          <td>
                            {emi.paymentMode ? (
                              <span className="badge bg-secondary text-white">
                                {emi.paymentMode.charAt(0).toUpperCase() + emi.paymentMode.slice(1)}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>{fmtDate(emi.dueDate)}</td>
                          <td>{fmtDate(emi.paidDate)}</td>
                          <td>
                            {emi.status === "paid" ? (
                              <span className="badge bg-success-subtle text-success border border-success border-opacity-25">Paid</span>
                            ) : emi.status === "pending" ? (
                              <span className="badge bg-warning-subtle text-warning border border-warning border-opacity-25">Pending</span>
                            ) : emi.status === "overdue" ? (
                              <span className="badge bg-danger-subtle text-danger border border-danger border-opacity-25">Overdue</span>
                            ) : (
                              <span className="badge bg-light text-muted">{emi.status}</span>
                            )}
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

export default EmiCollectionsReport;