import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import { OrgNode, OrgTreeStyles } from "../../components/shared/OrgTree.jsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [zoom, setZoom] = useState(1);
  const [treePreview, setTreePreview] = useState(false);

  const zoomIn = () => setZoom((z) => Math.min(z + 0.1, 1.6));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.4));
  const zoomReset = () => setZoom(1);

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
  const selectedProject = projects.find((p) => p._id === projectId);

  const openTreePreview = () => {
    if (!treeResult?.treeData) return;
    setTreePreview(true);
  };

  const generateTreePdf = () => {
    if (!treeResult?.treeData) return;
    const totalOwn = rows.reduce((sum, r) => sum + (r.own || 0), 0);

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 32;

    // ---- Header band ----
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 64, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text("FULL COMPANY TREE", pageWidth / 2, 26, { align: "center" });
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const rootLabel = `${selectedProject?.name?.toUpperCase() || "PROJECT"} (Pool ₹${selectedProject?.commissionPool ?? "—"}/sqft)`;
    doc.text(rootLabel, pageWidth / 2, 46, { align: "center" });

    // ---- Summary strip ----
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    const summaryY = 80;
    doc.text(`Members: ${rows.length}`, margin, summaryY);
    doc.text("Commission unit: per sq ft", pageWidth - margin, summaryY, { align: "right" });
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, summaryY + 8, pageWidth - margin, summaryY + 8);

    // ---- Table ----
    autoTable(doc, {
      startY: summaryY + 20,
      margin: { left: margin, right: margin },
      head: [["Name", "Designation", "Status", "Cap"]],
      body: rows.map((r) => [
        `${r.level > 1 ? "  ".repeat(r.level - 1) + "\u2514 " : ""}${r.name}`,
        r.designation,
        r.status?.charAt(0).toUpperCase() + r.status?.slice(1),
        r.cap != null ? `₹${r.cap.toLocaleString("en-IN")}` : "—",
      ]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 6, lineColor: [230, 230, 230], lineWidth: 0.5 },
      headStyles: { fillColor: [30, 27, 75], textColor: 255, fontStyle: "bold", halign: "left" },
      alternateRowStyles: { fillColor: [247, 247, 252] },
      columnStyles: {
        3: { halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          const val = String(data.cell.raw).toLowerCase();
          data.cell.styles.textColor = val === "active" ? [22, 163, 74] : [107, 114, 128];
          data.cell.styles.fontStyle = "bold";
        }
      },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
          pageWidth - margin - 60,
          pageHeight - 16
        );
        doc.text("MLM Real Estate · Confidential", margin, pageHeight - 16);
      },
    });

    doc.save(`full-company-tree-${(selectedProject?.name || "project").replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 flex-wrap gap-2">
        <h4 className="card-title mb-0">Full Company Tree</h4>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-primary" onClick={openTreePreview} disabled={!treeResult?.treeData}>
            <iconify-icon icon="solar:file-download-bold-duotone" className="align-middle me-1"></iconify-icon>
            Download
          </button>
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
      </div>

      <div className="card-body">
        {error && <div className="alert alert-danger">{error}</div>}
        <p className="text-muted small mb-3">
          Cap = rate assigned to that person by their upline · Pool = total rate allotted by the company for this project (per sq ft)
        </p>

        {loading && <div className="text-center py-4">Loading tree...</div>}

        {!loading && treeResult?.treeData && (
          <>
            <OrgTreeStyles />
            <div className="d-flex align-items-center gap-2 mb-2">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={zoomOut} title="Zoom out">
                <iconify-icon icon="solar:minus-circle-bold"></iconify-icon>
              </button>
              <span className="text-muted small" style={{ minWidth: 40, textAlign: "center" }}>
                {Math.round(zoom * 100)}%
              </span>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={zoomIn} title="Zoom in">
                <iconify-icon icon="solar:add-circle-bold"></iconify-icon>
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={zoomReset} title="Reset zoom">
                Reset
              </button>
            </div>
            <div className="org-tree-scroll mb-4" style={{ minHeight: 260 }}>
              <div className="org-tree-wrap" style={{ transform: `scale(${zoom})` }}>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {treePreview && treeResult?.treeData && (
        <div className="modal d-block" style={{ background: "rgba(15,15,25,0.6)" }} onClick={() => setTreePreview(false)}>
          <div className="modal-dialog modal-dialog-centered modal-xl" style={{ maxWidth: "95vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg overflow-hidden">
              <div
                className="modal-header border-0 flex-column position-relative py-4"
                style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}
              >
                <button className="btn-close position-absolute top-0 end-0 m-3" onClick={() => setTreePreview(false)}></button>
                <h5 className="modal-title fw-bold mb-1 text-uppercase text-center" style={{ letterSpacing: "0.5px", color: "#1e1b4b" }}>
                  Full Company Tree
                </h5>
                <p className="mb-0 small text-muted text-center fw-semibold">
                  {selectedProject?.name?.toUpperCase() || "PROJECT"} (Pool ₹{selectedProject?.commissionPool ?? "—"}/sqft)
                </p>
                <div className="d-flex justify-content-between w-100 px-2 mt-2">
                  <p className="mb-0 small text-muted">
                    Members: <span className="fw-semibold">{rows.length}</span>
                  </p>
                  <p className="mb-0 small text-muted">
                    Commission unit: <span className="fw-semibold">per sq ft</span>
                  </p>
                </div>
              </div>
              <div className="modal-body p-0" style={{ maxHeight: "60vh", overflow: "auto" }}>
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <tr>
                        {["Level", "Name", "Designation", "Status", "Cap"].map((h, i) => (
                          <th
                            key={i}
                            className="text-uppercase small fw-bold"
                            style={{ whiteSpace: "nowrap", background: "#1e1b4b", color: "#fff", padding: "10px 14px" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, ri) => (
                        <tr key={ri} style={{ background: ri % 2 ? "#fafaff" : "#fff" }}>
                          <td className="px-3 py-2">L{r.level}</td>
                          <td className="px-3 py-2" style={{ paddingLeft: `${12 + (r.level - 1) * 20}px` }}>
                            {r.level > 1 && "└ "}
                            {r.name}
                          </td>
                          <td className="px-3 py-2">{r.designation}</td>
                          <td className="px-3 py-2 text-capitalize">{r.status}</td>
                          <td className="px-3 py-2">{r.cap != null ? `₹${r.cap}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer bg-light border-0">
                <button className="btn" style={{ background: "#1e293b", color: "#fff" }} onClick={() => setTreePreview(false)}>
                  Close
                </button>
                <button className="btn" style={{ background: "#f59e0b", color: "#fff" }} onClick={generateTreePdf}>
                  <iconify-icon icon="solar:file-download-bold-duotone" className="align-middle me-1"></iconify-icon>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FullTree;