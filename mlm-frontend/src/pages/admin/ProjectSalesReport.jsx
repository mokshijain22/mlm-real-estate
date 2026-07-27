import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function ProjectSalesReport() {
  const [projects, setProjects] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("all");
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
      .then((res) => setAllProjects(res.data.data || res.data))
      .catch(() => {});
  }, []);

  const buildParams = () => {
    const params = { page };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (projectId) params.project_id = projectId;
    if (status !== "all") params.status = status;
    if (search.trim()) params.search = search.trim();
    return params;
  };

  useEffect(() => {
    api
      .get("/admin/reports/project-sales", { params: buildParams() })
      .then((res) => {
        setProjects(res.data.projects);
        setBookings(res.data.bookings.data);
        setMeta(res.data.bookings.meta);
        setSummary(res.data.summary);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, projectId, status, search, page]);

  const resetToPage1 = (setter) => (val) => {
    setPage(1);
    setter(val);
  };

  const resetFilters = () => {
    setPage(1);
    setDateFrom("");
    setDateTo("");
    setProjectId("");
    setStatus("all");
    setSearchInput("");
    setSearch("");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { ...buildParams() };
      delete params.page;
      const res = await api.get("/admin/reports/project-sales/export", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `project_sales_${Date.now()}.csv`);
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

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h3 className="mt-2 mb-4">Project Sales Report</h3>
          <button type="button" className="btn btn-success" onClick={handleExport} disabled={exporting}>
            <iconify-icon icon="solar:download-bold-duotone" className="me-1"></iconify-icon>
            {exporting ? "Exporting..." : "Export to CSV"}
          </button>
        </div>
      </div>

      {summary && (
        <div className="row">
          <div className="col-md-3 col-6">
            <div className="card bg-primary-subtle border-0">
              <div className="card-body">
                <p className="text-primary-emphasis fw-semibold mb-1">Total Revenue</p>
                <h4 className="fs-20 fw-bold text-primary mb-0">₹{fmt(summary.total_revenue)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card bg-success-subtle border-0">
              <div className="card-body">
                <p className="text-success-emphasis fw-semibold mb-1">Collected Amount</p>
                <h4 className="fs-20 fw-bold text-success mb-0">₹{fmt(summary.total_collected)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card bg-warning-subtle border-0">
              <div className="card-body">
                <p className="text-warning-emphasis fw-semibold mb-1">Pending Amount</p>
                <h4 className="fs-20 fw-bold text-warning mb-0">₹{fmt(summary.total_pending)}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card bg-info-subtle border-0">
              <div className="card-body">
                <p className="text-info-emphasis fw-semibold mb-1">Plots Sold</p>
                <h4 className="fs-20 fw-bold text-info mb-0">{summary.total_plots_sold}</h4>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row mt-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row g-2 align-items-end border-bottom pb-3 mb-4">
                <div className="col-md-3">
                  <label className="form-label">Search Bookings</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Customer, Booking#, Agent..."
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
                  <label className="form-label">Project</label>
                  <select className="form-select" value={projectId} onChange={(e) => resetToPage1(setProjectId)(e.target.value)}>
                    <option value="">All Projects</option>
                    {allProjects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Project Status</label>
                  <select className="form-select" value={status} onChange={(e) => resetToPage1(setStatus)(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
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

              <h5 className="mb-3">Project Overview</h5>
              <div className="table-responsive mb-5">
                <table className="table table-bordered table-centered table-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Project</th>
                      <th className="text-center">Total Plots</th>
                      <th className="text-center">Available</th>
                      <th className="text-center">Booked</th>
                      <th className="text-center">Sold</th>
                      <th className="text-end">Revenue</th>
                      <th className="text-end">Collected</th>
                      <th className="text-end">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!projects ? (
                      <tr>
                        <td colSpan="8" className="text-center py-3 text-muted">
                          Loading...
                        </td>
                      </tr>
                    ) : projects.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-3 text-muted">
                          No projects found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      projects.map((project) => (
                        <tr key={project._id}>
                          <td>
                            <Link to={`/admin/projects/${project._id}`} className="fw-bold">
                              {project.name}
                            </Link>
                            <br />
                            <span
                              className={`badge ${
                                project.status === "active" ? "bg-success-subtle text-success" : "bg-light text-muted"
                              } border my-1`}
                            >
                              {project.status?.charAt(0).toUpperCase() + project.status?.slice(1)}
                            </span>
                          </td>
                          <td className="text-center fw-semibold">{project.total_plots}</td>
                          <td className="text-center">{project.available_plots}</td>
                          <td className="text-center">{project.booked_plots}</td>
                          <td className="text-center text-primary fw-bold">{project.sold_plots}</td>
                          <td className="text-end">₹ {fmt(project.total_revenue)}</td>
                          <td className="text-end text-success">₹ {fmt(project.collected_amount)}</td>
                          <td className="text-end text-danger">₹ {fmt(project.pending_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Detailed Bookings List</h5>
                <span className="text-muted fs-14">Showing bookings based on filters.</span>
              </div>

              <div className="table-responsive">
                <table className="table table-centered table-nowrap table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Booking #</th>
                      <th>Customer</th>
                      <th>Plot</th>
                      <th>Agent</th>
                      <th>Total Amount</th>
                      <th>Booking Deposit</th>
                      <th>EMI Details</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!bookings ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4">
                          Loading...
                        </td>
                      </tr>
                    ) : bookings.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4">
                          <div className="my-3">
                            <iconify-icon icon="solar:document-text-line-duotone" className="text-muted fs-32"></iconify-icon>
                            <h5 className="mt-2">No Bookings Found</h5>
                            <p className="text-muted">There are no approved bookings matching your criteria.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      bookings.map((b) => (
                        <tr key={b._id}>
                          <td>
                            <Link to={`/admin/bookings/${b._id}`} className="fw-bold">
                              {b.bookingNumber}
                            </Link>
                          </td>
                          <td>{b.customer?.name || "N/A"}</td>
                          <td>
                            {b.plot ? (
                              <>
                                {b.plot.plotNumber}
                                {!projectId && <span className="text-muted fs-12 d-block">({b.project?.name || "N/A"})</span>}
                              </>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                          <td>{b.agent?.name || "N/A"}</td>
                          <td className="fw-bold">₹ {fmt(b.totalAmount)}</td>
                          <td>₹ {fmt(b.bookingAmount)}</td>
                          <td>
                            ₹ {fmt(b.emiAmount)} <span className="text-muted fs-12">/mo x {b.emiMonths}</span>
                          </td>
                          <td>
                            {b.approvalStatus === "approved" ? (
                              <span className="badge bg-success-subtle text-success border border-success border-opacity-25">
                                Approved
                              </span>
                            ) : b.approvalStatus === "pending" ? (
                              <span className="badge bg-warning-subtle text-warning border border-warning border-opacity-25">
                                Pending
                              </span>
                            ) : b.approvalStatus === "rejected" ? (
                              <span className="badge bg-danger-subtle text-danger border border-danger border-opacity-25">
                                Rejected
                              </span>
                            ) : (
                              <span className="badge bg-light text-muted">{b.approvalStatus}</span>
                            )}
                          </td>
                          <td>{new Date(b.bookingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
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

export default ProjectSalesReport;