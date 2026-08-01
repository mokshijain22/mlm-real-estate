import { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios.js";

function statusBadge(status) {
  if (status === "available") return "bg-success-subtle text-success";
  if (status === "booked") return "bg-warning-subtle text-warning";
  return "bg-danger-subtle text-danger";
}

function statusLabel(status) {
  if (status === "available") return "Available";
  if (status === "booked") return "Booked";
  return "Sold";
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return {
      number: row.number || row.plot_number || "",
      total_area: row.total_area || row.area || "",
      price_per_sqft: row.price_per_sqft || "",
      status: row.status || "available",
      plc_amount: row.plc_amount || "",
    };
  });
}

function PlotsList() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState(null);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  const [showImport, setShowImport] = useState(false);
  const [csvRows, setCsvRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const load = () => {
    api
      .get(`/admin/projects/${projectId}/plots`, { params: { page } })
      .then((res) => {
        setProject(res.data.project);
        setPlots(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, page]);

  const handleDelete = (plotId) => {
    if (!window.confirm("Are you sure you want to delete this plot?")) return;
    api
      .delete(`/admin/projects/${projectId}/plots/${plotId}`)
      .then(() => load())
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleCsvFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvRows(parseCsv(String(ev.target.result)));
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    if (!csvRows.length) return;
    setImporting(true);
    setImportResult(null);
    api
      .post(`/admin/projects/${projectId}/plots/bulk-import`, { rows: csvRows })
      .then((res) => {
        setImportResult(res.data);
        load();
      })
      .catch((err) => setImportResult({ error: err.response?.data?.message || err.message }))
      .finally(() => setImporting(false));
  };

  const closeImportModal = () => {
    setShowImport(false);
    setCsvRows([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!project || !plots) return <div className="text-center py-5">Loading...</div>;

  return (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div>
              <h4 className="header-title">Plots for Project: {project.name}</h4>
              <p className="text-muted mb-0">
                Location: {project.location || "N/A"} | Total Area:{" "}
                {Number(project.totalArea).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                sqft
              </p>
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-soft-primary btn-sm" onClick={() => setShowImport(true)}>
                <iconify-icon icon="solar:upload-linear" className="align-middle fs-16 me-1"></iconify-icon>
                Bulk Import (CSV)
              </button>
              <Link to={`/admin/projects/${projectId}/plots/create`} className="btn btn-primary btn-sm">
                Add Plot
              </Link>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-centered table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Plot Number</th>
                    <th>Total Area (sqft)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plots.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center">
                        No plots found for this project.
                      </td>
                    </tr>
                  )}
                  {plots.map((plot) => (
                    <tr key={plot._id}>
                      <td>
                        <h5 className="font-14 my-1">
                          <Link to={`/admin/projects/${projectId}/plots/${plot._id}`} className="text-body font-bold">
                            {plot.plotNumber}
                          </Link>
                        </h5>
                      </td>
                      <td>
                        {Number(plot.totalArea).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(plot.status)}`}>{statusLabel(plot.status)}</span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link
                            to={`/admin/projects/${projectId}/plots/${plot._id}`}
                            className="btn btn-light btn-sm"
                            title="View"
                          >
                            <iconify-icon icon="solar:eye-broken" className="align-middle fs-18"></iconify-icon>
                          </Link>
                          <Link
                            to={`/admin/projects/${projectId}/plots/${plot._id}/edit`}
                            className="btn btn-soft-primary btn-sm"
                            title="Edit"
                          >
                            <iconify-icon icon="solar:pen-2-broken" className="align-middle fs-18"></iconify-icon>
                          </Link>
                          <button
                            type="button"
                            className="btn btn-soft-danger btn-sm"
                            title="Delete"
                            onClick={() => handleDelete(plot._id)}
                          >
                            <iconify-icon icon="solar:trash-bin-trash-broken" className="align-middle fs-18"></iconify-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && (
              <div className="mt-3 d-flex justify-content-center gap-2">
                <button className="btn btn-light btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <span className="align-self-center">
                  Page {meta.page} of {meta.lastPage || 1}
                </span>
                <button
                  className="btn btn-light btn-sm"
                  disabled={page >= meta.lastPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showImport && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} onClick={closeImportModal}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Bulk Import Plots (CSV)</h5>
                <button className="btn-close" onClick={closeImportModal}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-2">
                  CSV headers: <code>number, total_area, price_per_sqft, status, plc_amount</code>. Plot numbers
                  that already exist in this project will be skipped.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="form-control mb-3"
                  onChange={handleCsvFile}
                />

                {csvRows.length > 0 && (
                  <div className="table-responsive" style={{ maxHeight: 300, overflowY: "auto" }}>
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Number</th>
                          <th>Total Area</th>
                          <th>Price/Sqft</th>
                          <th>Status</th>
                          <th>PLC Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows.map((r, i) => (
                          <tr key={i}>
                            <td>{r.number}</td>
                            <td>{r.total_area}</td>
                            <td>{r.price_per_sqft}</td>
                            <td>{r.status}</td>
                            <td>{r.plc_amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {importResult && (
                  <div className={`alert mt-3 ${importResult.error ? "alert-danger" : "alert-success"}`}>
                    {importResult.error ? (
                      importResult.error
                    ) : (
                      <>
                        <div>✓ {importResult.created} plot(s) created.</div>
                        {importResult.skipped_existing?.length > 0 && (
                          <div className="small mt-1">
                            Skipped (already exists): {importResult.skipped_existing.join(", ")}
                          </div>
                        )}
                        {importResult.skipped_no_space?.length > 0 && (
                          <div className="small mt-1">
                            Skipped (not enough remaining area): {importResult.skipped_no_space.join(", ")}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={closeImportModal}>
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!csvRows.length || importing}
                  onClick={handleImportSubmit}
                >
                  {importing ? "Importing..." : `Import ${csvRows.length || ""} Plot(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlotsList;