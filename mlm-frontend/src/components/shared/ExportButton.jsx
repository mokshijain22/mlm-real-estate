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
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} onClick={close}>
          <div className="modal-dialog modal-dialog-centered modal-xl" style={{ maxWidth: "95vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{title || "Export Preview"} <span className="text-muted small">({preview.rows.length} rows)</span></h5>
                <button className="btn-close" onClick={close}></button>
              </div>
              <div className="modal-body" style={{ maxHeight: "60vh", overflow: "auto" }}>
                {preview.rows.length === 0 ? (
                  <p className="text-muted mb-0">No data to export for the current filters.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered table-striped mb-0">
                      <thead>
                        <tr>{preview.headers.map((h, i) => <th key={i} style={{ whiteSpace: "nowrap" }}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 100).map((row, ri) => (
                          <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.rows.length > 100 && (
                      <p className="text-muted small mt-2 mb-0">Showing first 100 of {preview.rows.length} rows. Full data included in download.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={close}>Cancel</button>
                <button className="btn btn-success" onClick={handleDownloadCsv} disabled={!preview.rows.length}>Download CSV</button>
                <button className="btn btn-warning" onClick={handleDownloadPdf} disabled={!preview.rows.length}>Download PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ExportButton;