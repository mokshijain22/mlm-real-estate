const RANK_COLORS = [
  { bg: "#eef2ff", border: "#6366f1", badge: "#6366f1" },
  { bg: "#ecfdf5", border: "#10b981", badge: "#10b981" },
  { bg: "#fff7ed", border: "#f97316", badge: "#f97316" },
  { bg: "#fef2f2", border: "#ef4444", badge: "#ef4444" },
  { bg: "#f5f3ff", border: "#8b5cf6", badge: "#8b5cf6" },
  { bg: "#fffbeb", border: "#eab308", badge: "#eab308" },
];

function colorFor(rankName) {
  if (!rankName) return RANK_COLORS[0];
  let hash = 0;
  for (let i = 0; i < rankName.length; i++) hash = rankName.charCodeAt(i) + ((hash << 5) - hash);
  return RANK_COLORS[Math.abs(hash) % RANK_COLORS.length];
}

export function OrgNode({ node, isRoot, onNodeClick }) {
  const hasChildren = node.children && node.children.length > 0;
  const c = isRoot ? { bg: "#4f46e5", border: "#4f46e5", badge: "#fff" } : colorFor(node.rank_name);

  return (
    <div className="org-node">
      <div className="org-branch">
        <div
          className={`org-card ${isRoot ? "org-card-root" : ""}`}
          style={{ background: c.bg, borderColor: c.border, cursor: onNodeClick ? "pointer" : "default" }}
          onClick={() => onNodeClick && onNodeClick(node)}
        >
          <div className="org-avatar-wrap" style={{ borderColor: c.border }}>
            <img
              src={node.photo}
              alt={node.name}
              width="44"
              height="44"
              className="rounded-circle"
              onError={(e) => (e.target.style.display = "none")}
            />
          </div>
          <div className={`fw-semibold fs-13 mt-1 ${isRoot ? "text-white" : ""}`}>{node.name}</div>
          <span
            className="org-rank-badge"
            style={{
              background: isRoot ? "rgba(255,255,255,0.2)" : c.badge + "22",
              color: isRoot ? "#fff" : c.badge,
            }}
          >
            {node.isCompany ? "Company" : (node.rank_name || "N/A")}
          </span>
          {(node.pool != null || node.cap != null) && (
            <div className={`fs-11 mt-1 d-flex gap-2 ${isRoot ? "text-white-50" : "text-muted"}`}>
              {isRoot ? <span>POOL ₹{node.pool}</span> : <span>CAP ₹{node.cap}</span>}
              {node.own != null && <span>OWN ₹{node.own}</span>}
              {node.team != null && <span>TEAM ₹{node.team}</span>}
            </div>
          )}
        </div>
      </div>

      {hasChildren && (
        <div className="org-children">
          {node.children.map((child) => (
            <OrgNode key={child.id} node={child} onNodeClick={onNodeClick} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgTreeStyles() {
  return (
    <style>{`
      .org-tree-scroll {
        overflow: auto; padding: 40px 24px;
        background: radial-gradient(circle at 1px 1px, #e5e7eb 1px, transparent 0);
        background-size: 22px 22px;
        border-radius: 12px;
      }
      .org-tree-wrap { transform-origin: top center; transition: transform 0.15s; display: inline-flex; justify-content: center; width: 100%; }
      .org-node { display: flex; flex-direction: column; align-items: center; position: relative; padding: 0 14px; }
      .org-branch { position: relative; display: flex; justify-content: center; }
      .org-card {
        display: flex; flex-direction: column; align-items: center;
        border: 2px solid #e5e7eb; border-radius: 14px; padding: 12px 16px;
        background: #fff; min-width: 140px; text-align: center; white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.06); position: relative; z-index: 2;
      }
      .org-card-root { color: #fff; min-width: 160px; box-shadow: 0 6px 16px rgba(79,70,229,0.35); }
      .org-avatar-wrap {
        width: 48px; height: 48px; border-radius: 50%; border: 2px solid; padding: 2px;
        display: flex; align-items: center; justify-content: center; background: #fff;
      }
      .org-rank-badge {
        font-size: 10px; font-weight: 600; padding: 2px 10px; border-radius: 20px; margin-top: 4px;
      }
      .org-children {
        display: flex; gap: 8px; margin-top: 0; position: relative; padding-top: 28px;
      }
      .org-children::before {
        content: ""; position: absolute; top: 0; left: 50px; right: 50px; height: 2px;
        background: #c7cdf5;
      }
      .org-children:has(> .org-node:only-child)::before { left: 50%; right: 50%; }
      .org-children > .org-node::before {
        content: ""; position: absolute; top: -28px; left: 50%; width: 0; height: 28px;
        border-left: 2px solid #c7cdf5;
      }
    `}</style>
  );
}