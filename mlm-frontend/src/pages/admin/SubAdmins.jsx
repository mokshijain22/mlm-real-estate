import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function SubAdmins() {
  const [subAdmins, setSubAdmins] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const load = () => {
    const params = { page };
    if (search.trim()) params.search = search.trim();
    api
      .get("/admin/sub-admins", { params })
      .then((res) => {
        setSubAdmins(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleToggle = (admin) => {
    const action = admin.status === "active" ? "Deactivate" : "Activate";
    if (!window.confirm(`${action} this sub admin?`)) return;
    setActionLoading(admin._id);
    api
      .patch(`/admin/sub-admins/${admin._id}/toggle-status`)
      .then(() => load())
      .catch((err) => alert(err.response?.data?.message || err.message))
      .finally(() => setActionLoading(null));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <h4 className="card-title mb-0">Sub Admin Management</h4>
        <Link to="/admin/sub-admins/create" className="btn btn-primary btn-sm">
          <iconify-icon icon="solar:add-circle-bold-duotone" className="align-middle me-1"></iconify-icon>
          Add Sub Admin
        </Link>
      </div>
      <div className="card-body">
        <div className="input-group mb-3" style={{ maxWidth: 320 }}>
          <span className="input-group-text bg-light border-end-0">
            <iconify-icon icon="solar:magnifer-linear"></iconify-icon>
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-responsive">
          <table className="table table-centered table-nowrap mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!subAdmins ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : subAdmins.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center">
                    No Sub Admins found.
                  </td>
                </tr>
              ) : (
                subAdmins.map((admin) => (
                  <tr key={admin._id}>
                    <td>{admin.name}</td>
                    <td>{admin.email}</td>
                    <td>{admin.phone}</td>
                    <td>
                      {admin.status === "active" ? (
                        <span className="badge bg-success-subtle text-success">Active</span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger">Inactive</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/admin/sub-admins/${admin._id}/edit`} className="btn btn-sm btn-soft-primary">
                        <iconify-icon icon="solar:pen-bold"></iconify-icon> Edit
                      </Link>{" "}
                      {admin.status === "active" ? (
                        <button
                          className="btn btn-sm btn-soft-danger ms-1"
                          disabled={actionLoading === admin._id}
                          onClick={() => handleToggle(admin)}
                        >
                          <iconify-icon icon="solar:forbidden-circle-bold"></iconify-icon> Deactivate
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-soft-success ms-1"
                          disabled={actionLoading === admin._id}
                          onClick={() => handleToggle(admin)}
                        >
                          <iconify-icon icon="solar:check-circle-bold"></iconify-icon> Activate
                        </button>
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
  );
}

export default SubAdmins;