import { useState } from "react";
import api from "../../api/axios.js";
import { fetchCsvForPreview, downloadBlob, downloadPdfTable } from "../../utils/exportUtils.js";

function ExportButton({ url, params, title, filenamePrefix, className = "btn btn-success", label = "Export" }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [show, setShow] = useState(false);

  const openPreview = async () => {
    setLoading(true);
    try {
      const data = await fetchCsvForPreview(api, url, params);
      setPreview(data);
      setShow(true);
    } catch (err) {
      alert("Export failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const close = () => setShow(false);
  const handleDownloadCsv = () => preview && downloadBlob(preview.blob, `${filenamePrefix}_${Date.now()}.csv`);
  const handleDownloadPdf = () => preview && downloadPdfTable(title || filenamePrefix, preview.headers, preview.rows, `${filenamePrefix}_${Date.now()}.pdf`);

  return (
    <>
      <button type="button" className={className} onClick={openPreview} disabled={loading}>
        <iconify-icon icon="solar:download-bold-duotone" className="me-1"></iconify-icon>
        {loading ? "Preparing..." : label}
      </button>

      {show && preview && (
        <div className="modal d-block" style={{ background: "rgba(15,15,25,0.6)" }} onClick={close}>
          <div className="modal-dialog modal-dialog-centered modal-xl" style={{ maxWidth: "95vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg overflow-hidden">
              <div
                className="modal-header border-0 text-white"
                style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
              >
                <div>
                  <h5 className="modal-title fw-bold mb-1">{title || "Export Preview"}</h5>
                  <p className="mb-0 small opacity-75">
                    {preview.rows.length} record{preview.rows.length === 1 ? "" : "s"} \u00B7 Generated{" "}
                    {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <button className="btn-close btn-close-white" onClick={close}></button>
              </div>
              <div className="modal-body p-0" style={{ maxHeight: "60vh", overflow: "auto" }}>
                {preview.rows.length === 0 ? (
                  <p className="text-muted mb-0 p-4">No data to export for the current filters.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                        <tr>
                          {preview.headers.map((h, i) => (
                            <th
                              key={i}
                              className="text-uppercase small fw-bold"
                              style={{ whiteSpace: "nowrap", background: "#eef0ff", color: "#4338ca", padding: "10px 14px" }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 100).map((row, ri) => (
                          <tr key={ri} style={{ background: ri % 2 ? "#fafaff" : "#fff" }}>
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-3 py-2">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.rows.length > 100 && (
                      <p className="text-muted small m-3 mb-0">
                        Showing first 100 of {preview.rows.length} rows. Full data included in download.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer bg-light border-0">
                <button className="btn btn-light" onClick={close}>
                  Cancel
                </button>
                <button className="btn btn-success" onClick={handleDownloadCsv} disabled={!preview.rows.length}>
                  <iconify-icon icon="solar:file-text-bold-duotone" className="align-middle me-1"></iconify-icon>
                  Download CSV
                </button>
                <button className="btn btn-primary" onClick={handleDownloadPdf} disabled={!preview.rows.length}>
                  <iconify-icon icon="solar:file-download-bold-duotone" className="align-middle me-1"></iconify-icon>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ExportButton;