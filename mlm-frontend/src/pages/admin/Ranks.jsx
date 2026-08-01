import { useEffect, useState } from "react";
import api from "../../api/axios.js";

const rankColorMap = {
  "B.EX": "secondary",
  "S.EX": "primary",
  MGR: "info",
  "S.MGR": "success",
  AD: "warning",
  SD: "danger",
};

function Ranks() {
  const [ranks, setRanks] = useState(null);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    api
      .get("/admin/ranks")
      .then((res) => setRanks(res.data.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (rank) => {
    setEditingId(rank._id);
    setFieldErrors({});
    setForm({
      bv_points: rank.bvPoints,
      pv_points: rank.pvPoints,
      min_group_sales: rank.minGroupSales,
      min_team_size: rank.minTeamSize,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFieldErrors({});
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = (id) => {
    setSaving(true);
    setFieldErrors({});
    api
      .patch(`/admin/ranks/${id}`, form)
      .then(() => {
        setEditingId(null);
        load();
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setFieldErrors(err.response.data.errors);
        } else {
          alert(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setSaving(false));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <div className="row align-items-center mb-4">
        <div className="col-sm-8">
          <h3 className="fw-bold mb-1">Rank Management</h3>
          <p className="text-muted mb-0">View and configure rank qualification criteria.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover table-nowrap align-middle mb-0">
            <thead className="bg-light bg-opacity-50">
              <tr>
                <th className="ps-3 text-muted small">Rank</th>
                <th className="text-muted small">Online Points</th>
                <th className="text-muted small">Cash Points</th>
                <th className="text-muted small">Min Group Sales (SQFT)</th>
                <th className="text-muted small">Min Team Size</th>
                <th className="text-muted small">Agents</th>
                <th className="text-muted small text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!ranks ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    Loading...
                  </td>
                </tr>
              ) : (
                ranks.map((rank) => {
                  const color = rankColorMap[rank.abbreviation] || "primary";
                  const isEditing = editingId === rank._id;
                  return (
                    <tr key={rank._id}>
                      <td className="ps-3">
                        <span className={`badge bg-${color}-subtle text-${color} border border-${color} border-opacity-25 fs-13`}>
                          {rank.name} ({rank.abbreviation})
                        </span>
                      </td>
                      <td>
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              name="bv_points"
                              className={`form-control form-control-sm ${fieldErrors.bv_points ? "is-invalid" : ""}`}
                              style={{ maxWidth: "100px" }}
                              value={form.bv_points}
                              onChange={handleChange}
                            />
                            {fieldErrors.bv_points && <div className="invalid-feedback">{fieldErrors.bv_points}</div>}
                          </>
                        ) : (
                          rank.bvPoints
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              name="pv_points"
                              className={`form-control form-control-sm ${fieldErrors.pv_points ? "is-invalid" : ""}`}
                              style={{ maxWidth: "100px" }}
                              value={form.pv_points}
                              onChange={handleChange}
                            />
                            {fieldErrors.pv_points && <div className="invalid-feedback">{fieldErrors.pv_points}</div>}
                          </>
                        ) : (
                          rank.pvPoints
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              name="min_group_sales"
                              className={`form-control form-control-sm ${fieldErrors.min_group_sales ? "is-invalid" : ""}`}
                              style={{ maxWidth: "120px" }}
                              value={form.min_group_sales}
                              onChange={handleChange}
                            />
                            {fieldErrors.min_group_sales && (
                              <div className="invalid-feedback">{fieldErrors.min_group_sales}</div>
                            )}
                          </>
                        ) : (
                          Math.round(rank.minGroupSales)
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              name="min_team_size"
                              className={`form-control form-control-sm ${fieldErrors.min_team_size ? "is-invalid" : ""}`}
                              style={{ maxWidth: "100px" }}
                              value={form.min_team_size}
                              onChange={handleChange}
                            />
                            {fieldErrors.min_team_size && (
                              <div className="invalid-feedback">{fieldErrors.min_team_size}</div>
                            )}
                          </>
                        ) : (
                          rank.minTeamSize
                        )}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{rank.agentsCount}</span>
                      </td>
                      <td className="text-end pe-3">
                        {isEditing ? (
                          <div className="d-flex gap-1 justify-content-end">
                            <button
                              className="btn btn-sm btn-success"
                              disabled={saving}
                              onClick={() => handleSave(rank._id)}
                            >
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn-sm btn-soft-primary" onClick={() => startEdit(rank)}>
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Ranks;