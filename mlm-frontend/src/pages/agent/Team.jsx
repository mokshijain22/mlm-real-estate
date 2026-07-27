import { useEffect, useState } from "react";
import api from "../../api/axios.js";

function TreeNode({ node, isRoot }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <li>
      <div className={`d-inline-flex align-items-center gap-2 border rounded-3 px-3 py-2 mb-2 ${isRoot ? "bg-primary-subtle border-primary" : "bg-white"}`}>
        {hasChildren && (
          <button
            type="button"
            className="btn btn-sm btn-link p-0 text-decoration-none"
            onClick={() => setExpanded((v) => !v)}
          >
            <iconify-icon icon={expanded ? "solar:minus-circle-bold" : "solar:add-circle-bold"}></iconify-icon>
          </button>
        )}
        <img
          src={node.photo}
          alt={node.name}
          width="32"
          height="32"
          className="rounded-circle"
          onError={(e) => (e.target.style.display = "none")}
        />
        <div>
          <div className="fw-semibold fs-13">{node.name}</div>
          <div className="text-muted" style={{ fontSize: 11 }}>
            {node.rank_name} &middot; {node.role}
          </div>
        </div>
        {hasChildren && (
          <span className="badge bg-secondary-subtle text-secondary ms-1">{node.children.length}</span>
        )}
      </div>

      {hasChildren && expanded && (
        <ul className="list-unstyled ms-4 ps-3 border-start">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Team() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("tree"); // "tree" | "byRank"

  useEffect(() => {
    api
      .get("/agent/referrals/team")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!data) return <div className="text-center py-5">Loading...</div>;

  const { teamByRank, allRanks, treeData } = data;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">My Team</h4>
          <p className="text-muted mb-0 fs-13">View your downline hierarchy and rank-wise breakdown.</p>
        </div>
        <div className="btn-group">
          <button
            className={`btn btn-sm ${view === "tree" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setView("tree")}
          >
            Tree View
          </button>
          <button
            className={`btn btn-sm ${view === "byRank" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setView("byRank")}
          >
            By Rank
          </button>
        </div>
      </div>

      {view === "tree" ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4" style={{ overflowX: "auto" }}>
            {treeData ? (
              <ul className="list-unstyled mb-0">
                <TreeNode node={treeData} isRoot />
              </ul>
            ) : (
              <p className="text-muted mb-0">No team data available.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="row">
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
          {allRanks.every((r) => !teamByRank[r._id] || teamByRank[r._id].users.length === 0) && (
            <p className="text-muted px-3">No team members found at any rank yet.</p>
          )}
        </div>
      )}
    </>
  );
}

export default Team;