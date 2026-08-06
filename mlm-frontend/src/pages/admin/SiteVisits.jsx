import { useEffect, useState } from "react";
import api from "../../api/axios.js";

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SiteVisits() {
  const [visits, setVisits] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  function load() {
    api
      .get("/admin/site-visits", {
        params: {
          page,
          search: search || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      })
      .then((res) => {
        setVisits(res.data.data || []);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleApply() {
    setPage(1);
    load();
  }

  function handleReset() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setTimeout(load, 0);
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white py-3">
        <h4 className="card-title mb-0">Site Visits</h4>
        <p className="text-muted small mb-0">Visits booked by field executives from the mobile app</p>
      </div>

      <div className="card-body border-bottom">
        <div className="row g-3 align-items-end">
          <div className="col-md-5">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by name or mobile"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">From</label>
            <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label">To</label>
            <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="col-md-3 d-flex gap-2">
            <button type="button" className="btn btn-light flex-fill" onClick={handleReset}>
              Reset
            </button>
            <button type="button" className="btn btn-primary flex-fill" onClick={handleApply}>
              Apply
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card-body pb-0">
          <div className="alert alert-danger mb-0">{error}</div>
        </div>
      )}

      <div className="card-body">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr className="text-muted small text-uppercase">
                <th>Photo</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Alt mobile</th>
                <th>Email</th>
                <th>Address</th>
                <th>Project</th>
                <th>Executive</th>
                <th>Visit date</th>
              </tr>
            </thead>
            <tbody>
              {!visits ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">
                    Loading…
                  </td>
                </tr>
              ) : visits.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">
                    No site visits found.
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr key={v._id}>
                    <td>
                      {v.photo ? (
                        <img
                          src={v.photo}
                          alt={v.customerName}
                          className="rounded"
                          style={{ width: 36, height: 36, objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          className="rounded bg-secondary-subtle d-flex align-items-center justify-content-center fw-bold text-secondary"
                          style={{ width: 36, height: 36 }}
                        >
                          {v.customerName?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </td>
                    <td className="fw-semibold">{v.customerName}</td>
                    <td>{v.mobile}</td>
                    <td>{v.altMobile || "-"}</td>
                    <td>{v.email || "-"}</td>
                    <td>{v.address || "-"}</td>
                    <td>{v.project?.name || "-"}</td>
                    <td>{v.agent?.name || "-"}</td>
                    <td>{fmtDate(v.visitDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && (
          <div className="d-flex justify-content-between align-items-center mt-3">
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
  );
}

export default SiteVisits;