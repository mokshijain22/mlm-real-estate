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

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const dateRangeLabel = params?.date_from || params?.date_to
    ? `Period: ${params?.date_from ? formatDate(params.date_from) : "Beginning"} — ${params?.date_to ? formatDate(params.date_to) : "Today"}`
    : "Period: All time";

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
                className="modal-header border-0 flex-column position-relative py-4"
                style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}
              >
                <button className="btn-close position-absolute top-0 end-0 m-3" onClick={close}></button>
                <h5 className="modal-title fw-bold mb-1 text-uppercase text-center" style={{ letterSpacing: "0.5px", color: "#1e1b4b" }}>
                  {title || "Export Preview"}
                </h5>
                <p className="mb-0 small text-muted text-center">
                  Generated on {new Date().toLocaleDateString("en-IN")} &nbsp;·&nbsp; Total Records: {preview.rows.length}
                </p>
                <p className="mb-0 small text-muted text-center fst-italic">{dateRangeLabel}</p>
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
                            {row.map((cell, ci) => {
                              const isStatus = /^(PENDING|PAID|APPROVED|REJECTED|CANCELLED|ACTIVE|INACTIVE)$/i.test(String(cell).trim());
                              return (
                                <td key={ci} className="px-3 py-2">
                                  {isStatus ? (
                                    <span
                                      className="badge rounded-pill fw-semibold px-2 py-1"
                                      style={{
                                        background: /^paid|approved|active$/i.test(cell) ? "#dcfce7" : /^pending$/i.test(cell) ? "#ffedd5" : "#fee2e2",
                                        color: /^paid|approved|active$/i.test(cell) ? "#166534" : /^pending$/i.test(cell) ? "#c2410c" : "#991b1b",
                                      }}
                                    >
                                      {cell}
                                    </span>
                                  ) : (
                                    cell
                                  )}
                                </td>
                              );
                            })}
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
                <button className="btn" style={{ background: "#1e293b", color: "#fff" }} onClick={close}>
                  Close
                </button>
                <button className="btn btn-success" onClick={handleDownloadCsv} disabled={!preview.rows.length}>
                  <iconify-icon icon="solar:file-text-bold-duotone" className="align-middle me-1"></iconify-icon>
                  Download CSV
                </button>
                <button className="btn" style={{ background: "#f59e0b", color: "#fff" }} onClick={handleDownloadPdf} disabled={!preview.rows.length}>
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