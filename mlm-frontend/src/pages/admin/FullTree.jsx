import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import { OrgNode, OrgTreeStyles } from "../../components/shared/OrgTree.jsx";

function flattenTree(node, level = 1, rows = []) {
  rows.push({
    level,
    name: node.name,
    designation: node.isCompany ? "Company" : (node.rank_name || "N/A"),
    status: node.status || "—",
    cap: node.cap ?? 0,
    own: node.own ?? 0,
    team: node.team ?? 0,
  });
  (node.children || []).forEach((child) => flattenTree(child, level + 1, rows));
  return rows;
}

function FullTree() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [treeResult, setTreeResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/admin/projects", { params: { limit: 100 } })
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setProjects(list);
        if (list.length > 0) setProjectId(list[0]._id);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    api
      .get("/admin/tree/company", { params: { projectId, _t: Date.now() } })
      .then((res) => setTreeResult(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const rows = treeResult?.treeData ? flattenTree(treeResult.treeData) : [];

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 flex-wrap gap-2">
        <h4 className="card-title mb-0">Full Company Tree</h4>
        <select
          className="form-select form-select-sm"
          style={{ maxWidth: 320 }}
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setTreeResult(null);
          }}
        >
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} (Pool ₹{p.commissionPool}/sqft)
            </option>
          ))}
        </select>
      </div>

      <div className="card-body">
        {error && <div className="alert alert-danger">{error}</div>}
        <p className="text-muted small mb-3">
          Cap = rate assigned to that person by their upline · Own = kept by them · Team = handed down to their reports (per sq ft)
        </p>

        {loading && <div className="text-center py-4">Loading tree...</div>}

        {!loading && treeResult?.treeData && (
          <>
            <OrgTreeStyles />
            <div className="org-tree-scroll mb-4" style={{ minHeight: 260 }}>
              <div className="org-tree-wrap">
                <OrgNode node={treeResult.treeData} isRoot />
              </div>
            </div>

            <h5 className="fw-bold mb-3">Full Tree — List View</h5>
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr className="text-muted small text-uppercase">
                    <th>Level</th>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Cap/Pool (₹)</th>
                    <th>Own (₹)</th>
                    <th>Team (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.level}</td>
                      <td>{r.name}</td>
                      <td>{r.designation}</td>
                      <td className="text-capitalize">{r.status}</td>
                      <td>₹{r.cap}</td>
                      <td>₹{r.own}</td>
                      <td>₹{r.team}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FullTree;