import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import { OrgNode, OrgTreeStyles } from "../../components/shared/OrgTree.jsx";

function Team() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("tree"); // "tree" | "list"
  const [scale, setScale] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get("/agent/referrals/team")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!data) return <div className="text-center py-5">Loading...</div>;

  const { teamByRank, allRanks, treeData, totalTeamMembers } = data;

  // flatten tree for list view
  const flatList = [];
  const flatten = (node, depth) => {
    if (depth > 0) flatList.push({ ...node, depth });
    (node.children || []).forEach((c) => flatten(c, depth + 1));
  };
if (treeData) flatten(treeData, 0);

  const filteredList = flatList.filter((n) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (n.name || "").toLowerCase().includes(q) ||
      (n.rank_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <OrgTreeStyles />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-1">My Team</h4>
          <p className="text-muted mb-0 fs-13">View your downline hierarchy and rank-wise breakdown.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3 d-flex justify-content-between align-items-center">
          <h6 className="fw-bold mb-0">Total Team Members: {totalTeamMembers ?? 0}</h6>
          <div className="btn-group">
            <button
              className={`btn btn-sm ${view === "list" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setView("list")}
            >
              List View
            </button>
            <button
              className={`btn btn-sm ${view === "tree" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setView("tree")}
            >
              Tree View
            </button>
          </div>
        </div>
      </div>

      {view === "tree" ? (
        <div className="card border-0 shadow-sm position-relative">
          <div className="position-absolute top-0 end-0 m-2 d-flex flex-column gap-1" style={{ zIndex: 2 }}>
            <button className="btn btn-sm btn-light border" onClick={() => setScale((s) => Math.min(s + 0.15, 2))}>
              <iconify-icon icon="solar:magnifer-zoom-in-bold"></iconify-icon>
            </button>
            <button className="btn btn-sm btn-light border" onClick={() => setScale((s) => Math.max(s - 0.15, 0.4))}>
              <iconify-icon icon="solar:magnifer-zoom-out-bold"></iconify-icon>
            </button>
            <button className="btn btn-sm btn-light border" onClick={() => setScale(1)}>
              <iconify-icon icon="solar:restart-bold"></iconify-icon>
            </button>
          </div>
          <div className="org-tree-scroll" style={{ minHeight: 320 }}>
            <div className="org-tree-wrap" style={{ transform: `scale(${scale})` }}>
              {treeData ? <OrgNode node={treeData} isRoot hideCommission /> : <p className="text-muted mb-0">No team data available.</p>}
            </div>
          </div>
        </div>
     ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-3 pb-0">
            <div className="input-group" style={{ maxWidth: 320 }}>
              <span className="input-group-text bg-light border-end-0">
                <iconify-icon icon="solar:magnifer-linear"></iconify-icon>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by name or rank..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="card-body p-0">
            {filteredList.length === 0 ? (
              <div className="text-center py-5 text-muted">
                {flatList.length === 0 ? "No team members found yet." : "No members match your search."}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Level</th>
                      <th>Rank</th>
                      <th>Position</th>
                      <th>Created Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((n) => (
                      <tr key={n.id}>
                        <td>
                          <span style={{ display: "inline-block", width: (n.depth - 1) * 18 }} />
                          {n.name}
                        </td>
                        <td>{n.depth}</td>
                        <td>{n.rank_name}</td>
                        <td>{n.position || "-"}</td>
                        <td>{n.slab_per_sqft != null ? `₹${n.slab_per_sqft}` : "-"}</td>
                        <td className="text-muted small">
                          {n.created_at ? new Date(n.created_at).toLocaleDateString("en-IN") : "-"}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              n.status === "active"
                                ? "bg-success-subtle text-success"
                                : n.status === "blocked"
                                ? "bg-danger-subtle text-danger"
                                : "bg-secondary-subtle text-secondary"
                            }`}
                          >
                            {n.status || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="row mt-4">
        {allRanks.map((rank) => {
          const group = teamByRank[rank._id];
          if (!group || group.users.length === 0) return null;
          return (
            <div className="col-md-6 mb-4" key={rank._id}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0">
                      {rank.name} <span className="text-muted fs-13">({rank.abbreviation})</span>
                    </h6>
                    <span className="badge bg-primary-subtle text-primary">{group.users.length}</span>
                  </div>
                  <ul className="list-unstyled mb-0">
                    {group.users.map((u) => (
                      <li key={u._id} className="d-flex justify-content-between border-bottom py-2">
                        <span>{u.name}</span>
                        <span className="text-muted fs-13">{u.referrals_count} referrals</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default Team;