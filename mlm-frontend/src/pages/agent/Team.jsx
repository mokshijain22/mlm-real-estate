import { useEffect, useRef, useState } from "react";
import api from "../../api/axios.js";

function OrgNode({ node, isRoot }) {
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className="org-node">
      <div className={`org-card ${isRoot ? "org-card-root" : ""}`}>
        <img
          src={node.photo}
          alt={node.name}
          width="40"
          height="40"
          className="rounded-circle mb-1"
          onError={(e) => (e.target.style.display = "none")}
        />
        <div className="fw-semibold fs-13">{node.name}</div>
        <div className="text-muted" style={{ fontSize: 11 }}>
          {node.rank_name}
        </div>
      </div>
      {hasChildren && (
        <div className="org-children">
          {node.children.map((child) => (
            <OrgNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function Team() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("tree"); // "tree" | "list"
  const [scale, setScale] = useState(1);
  const scrollRef = useRef(null);

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

  return (
    <>
      <style>{`
        .org-tree-scroll { overflow: auto; padding: 24px; }
        .org-tree-wrap { transform-origin: top left; transition: transform 0.15s; display: inline-block; }
        .org-node { display: flex; flex-direction: column; align-items: center; position: relative; }
        .org-card {
          display: flex; flex-direction: column; align-items: center;
          border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 14px;
          background: #fff; min-width: 130px; text-align: center; white-space: nowrap;
        }
        .org-card-root { background: #eef2ff; border-color: #6366f1; }
        .org-children {
          display: flex; gap: 24px; margin-top: 24px; position: relative; padding-top: 24px;
          border-top: 2px solid #f3a15a;
        }
        .org-node .org-children::before {
          content: ""; position: absolute; top: -24px; left: 50%; width: 0; height: 24px;
          border-left: 2px solid #f3a15a;
        }
      `}</style>

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
          <div className="org-tree-scroll" ref={scrollRef}>
            <div className="org-tree-wrap" style={{ transform: `scale(${scale})` }}>
              {treeData ? <OrgNode node={treeData} isRoot /> : <p className="text-muted mb-0">No team data available.</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {flatList.length === 0 ? (
              <div className="text-center py-5 text-muted">No team members found yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Level</th>
                      <th>Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatList.map((n) => (
                      <tr key={n.id}>
                        <td>
                          <span style={{ display: "inline-block", width: (n.depth - 1) * 18 }} />
                          {n.name}
                        </td>
                        <td>{n.depth}</td>
                        <td>{n.rank_name}</td>
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