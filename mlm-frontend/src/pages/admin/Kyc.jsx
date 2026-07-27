import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function Kyc() {
  const [kycs, setKycs] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api
      .get("/admin/kyc", { params: { status, page } })
      .then((res) => {
        setKycs(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [status, page]);

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <div className="row align-items-center mb-4">
        <div className="col-sm-8">
          <h3 className="fw-bold mb-1">KYC Approvals</h3>
          <p className="text-muted mb-0">Review and approve agent KYC submissions.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-3">
              <select
                className="form-select"
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover table-nowrap align-middle mb-0">
            <thead className="bg-light bg-opacity-50">
              <tr>
                <th className="ps-3 text-muted small">Agent</th>
                <th className="text-muted small">Referred By</th>
                <th className="text-muted small">Email</th>
                <th className="text-muted small">Aadhaar No.</th>
                <th className="text-muted small">PAN No.</th>
                <th className="text-muted small">Status</th>
                <th className="text-muted small">Submitted</th>
                <th className="text-muted small text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!kycs ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    Loading...
                  </td>
                </tr>
              ) : kycs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    No KYC applications found.
                  </td>
                </tr>
              ) : (
                kycs.map((kyc) => (
                  <tr key={kyc._id}>
                    <td className="ps-3 fw-medium">{kyc.user?.name || "-"}</td>
                    <td>{kyc.user?.referredBy?.name || "-"}</td>
                    <td>{kyc.user?.email || "-"}</td>
                    <td>{kyc.aadhaarNumber || "-"}</td>
                    <td>{kyc.panNumber || "-"}</td>
                    <td>
                      <span
                        className={`badge ${
                          kyc.status === "approved"
                            ? "bg-success-subtle text-success"
                            : kyc.status === "rejected"
                            ? "bg-danger-subtle text-danger"
                            : "bg-warning-subtle text-warning"
                        }`}
                      >
                        {kyc.status.charAt(0).toUpperCase() + kyc.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-muted small">{new Date(kyc.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="text-end pe-3">
                      <Link to={`/admin/kyc/${kyc._id}`} className="btn btn-sm btn-soft-primary">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center">
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
    </>
  );
}

export default Kyc;