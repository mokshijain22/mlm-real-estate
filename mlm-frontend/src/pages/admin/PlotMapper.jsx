import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios.js";

const STORAGE_BASE = "http://localhost:5000";
const STATUSES = ["available", "booked", "sold"];

function statusColor(status) {
  return status === "available" ? "#10b981" : status === "booked" ? "#f59e0b" : "#ef4444";
}

function latLngsToRect(latlngs, imgW, imgH) {
  const lats = latlngs.map((p) => p[0]);
  const lngs = latlngs.map((p) => p[1]);
  const top = 1000 - Math.max(...lats);
  const bottom = 1000 - Math.min(...lats);
  const left = Math.min(...lngs);
  const right = Math.max(...lngs);
  return {
    x: (left / 1000) * imgW,
    y: (top / 1000) * imgH,
    w: ((right - left) / 1000) * imgW,
    h: ((bottom - top) / 1000) * imgH,
  };
}

function rectToLatLngs(x, y, w, h, imgW, imgH) {
  const lng1 = (x / imgW) * 1000;
  const lng2 = ((x + w) / imgW) * 1000;
  const lat1 = 1000 - (y / imgH) * 1000;
  const lat2 = 1000 - ((y + h) / imgH) * 1000;
  return [
    [lat1, lng1],
    [lat1, lng2],
    [lat2, lng2],
    [lat2, lng1],
  ];
}

function parseCsv(text) {
  const cleanText = text.replace(/^\uFEFF/, ""); // strip BOM from Excel exports
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return {};
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^\uFEFF/, ""));
  const map = {};
  lines.slice(1).forEach((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] || "").trim()));
    const number = (row.number || row.plot_number || row.plotnumber || "").trim();
    if (!number) return;
    const sizeMatch = String(row.size || "").match(/([\d.]+)\s*[xX×]\s*([\d.]+)/);
    const areaFromSize = sizeMatch ? String(parseFloat(sizeMatch[1]) * parseFloat(sizeMatch[2])) : "";
    map[number] = {
      total_area: row.total_area || row.area || areaFromSize || "",
      price_per_sqft: row.price_per_sqft || row.price || row.final_price || row.base_price || "",
      status: STATUSES.includes(row.status) ? row.status : "",
      plc_percent: row.plc_percent || "",
      facing: row.facing || "",
      zone_type: row.zone_type || "",
      corner_plot: row.corner_plot || "",
      boundary_n: row.boundary_n || "",
      boundary_s: row.boundary_s || "",
      boundary_e: row.boundary_e || "",
      boundary_w: row.boundary_w || "",
    };
  });
  return map;
}

function PlotMapper() {
  const { id } = useParams();
  const imgRef = useRef(null);

  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState([]);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [uploading, setUploading] = useState(false);
  const [csvData, setCsvData] = useState({});
  const [csvCount, setCsvCount] = useState(0);

  const [draft, setDraft] = useState(null); // first click point
  const [pendingRect, setPendingRect] = useState(null); // rect awaiting form
  const [form, setForm] = useState({
    number: "", total_area: "", price_per_sqft: "", status: "available", plc_percent: "",
    facing: "", zone_type: "", corner_plot: "", boundary_n: "", boundary_s: "", boundary_e: "", boundary_w: "",
  });

  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewPlot, setPreviewPlot] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showFormPreview, setShowFormPreview] = useState(false);

  const load = () => {
    api.get(`/admin/projects/${id}/builder`).then((res) => {
      setProject(res.data.project);
      setPlots(res.data.plots || []);
    });
  };

  useEffect(load, [id]);

  const imageUrl = project?.mapData?.imageUrl ? `${STORAGE_BASE}/storage/${project.mapData.imageUrl}` : null;
  const mappedPlots = plots.filter((p) => p.mapCoordinates?.latlngs);

  const stats = {
    traced: mappedPlots.length,
    available: mappedPlots.filter((p) => p.status === "available").length,
    booked: mappedPlots.filter((p) => p.status === "booked").length,
    sold: mappedPlots.filter((p) => p.status === "sold").length,
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("map_image", file);
    setUploading(true);
    api
      .post(`/admin/projects/${id}/map-image`, fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((res) => {
        setProject(res.data.project);
        setMessage({ type: "success", text: "Map image uploaded." });
      })
      .catch((err) => setMessage({ type: "error", text: err.response?.data?.message || err.message }))
      .finally(() => setUploading(false));
  };

  const handleCsvFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const map = parseCsv(evt.target.result);
      setCsvData(map);
      setCsvCount(Object.keys(map).length);
      setMessage({ type: "success", text: `CSV loaded: ${Object.keys(map).length} plot rows. Fields auto-fill as soon as you enter the number.` });
    };
    reader.readAsText(file);
  };

  const getPoint = (e) => {
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = imgNatural.w / rect.width;
    const scaleY = imgNatural.h / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handleImageClick = (e) => {
    if (pendingRect) return; // form already open, ignore extra clicks
    const point = getPoint(e);
    if (!draft) {
      setDraft(point);
      return;
    }
    const x = Math.min(draft.x, point.x);
    const y = Math.min(draft.y, point.y);
    const w = Math.abs(point.x - draft.x);
    const h = Math.abs(point.y - draft.y);
    setDraft(null);
    setPendingRect({ x, y, w, h });
   setForm({
      number: "", total_area: "", price_per_sqft: "", status: "available", plc_percent: "",
      facing: "", zone_type: "", corner_plot: "", boundary_n: "", boundary_s: "", boundary_e: "", boundary_w: "",
    });
  };

  const cancelDraft = () => {
    setDraft(null);
    setPendingRect(null);
  };

  const handleDeletePlot = () => {
    if (!previewPlot) return;
    if (!window.confirm(`Do you want to delete plot #${previewPlot.plotNumber} completely? This cannot be undone.`)) return;
    setDeleting(true);
    api
      .delete(`/admin/projects/${id}/plots/${previewPlot._id}`)
      .then(() => {
        setMessage({ type: "success", text: `Plot #${previewPlot.plotNumber} was deleted.` });
        setPreviewPlot(null);
        load();
      })
      .catch((err) => setMessage({ type: "error", text: err.response?.data?.message || err.message }))
      .finally(() => setDeleting(false));
  };

  const handleUnmapPlot = () => {
    if (!previewPlot) return;
    if (!window.confirm(`Do you want to remove the tracing for plot #${previewPlot.plotNumber}? The plot record will remain, but it will be removed from the map.`)) return;
    setDeleting(true);
    api
      .post(`/admin/projects/${id}/layout`, { plots: { [previewPlot._id]: { latlngs: null } } })
      .then(() => {
        setMessage({ type: "success", text: `Plot #${previewPlot.plotNumber} was removed from the map.` });
        setPreviewPlot(null);
        load();
      })
      .catch((err) => setMessage({ type: "error", text: err.response?.data?.message || err.message }))
      .finally(() => setDeleting(false));
  };

  const handleNumberChange = (value) => {
    const trimmed = String(value).trim();
    const existing = plots.find((p) => String(p.plotNumber) === trimmed);
    const csvRow = csvData[trimmed];
    setForm((f) => ({
      ...f,
      number: value,
      total_area: csvRow?.total_area || existing?.totalArea || f.total_area,
      price_per_sqft: csvRow?.price_per_sqft || existing?.pricePerSqft || f.price_per_sqft,
      status: csvRow?.status || existing?.status || f.status,
      plc_percent: csvRow?.plc_percent || existing?.plcPercent || f.plc_percent,
      facing: csvRow?.facing || f.facing,
      zone_type: csvRow?.zone_type || f.zone_type,
      corner_plot: csvRow?.corner_plot || f.corner_plot,
      boundary_n: csvRow?.boundary_n || f.boundary_n,
      boundary_s: csvRow?.boundary_s || f.boundary_s,
      boundary_e: csvRow?.boundary_e || f.boundary_e,
      boundary_w: csvRow?.boundary_w || f.boundary_w,
    }));
  };

  const savePlot = () => {
    if (!form.number.trim() || !pendingRect) {
      setMessage({ type: "error", text: "Enter a plot number." });
      return;
    }
    const latlngs = rectToLatLngs(pendingRect.x, pendingRect.y, pendingRect.w, pendingRect.h, imgNatural.w, imgNatural.h);
    const existing = plots.find((p) => String(p.plotNumber) === String(form.number));
    setSaving(true);

    const finish = (plotId) => {
      api
        .post(`/admin/projects/${id}/layout`, { plots: { [plotId]: { latlngs } } })
        .then(() => {
          setMessage({ type: "success", text: `Plot #${form.number} was traced and saved.` });
          cancelDraft();
          load();
        })
        .catch((err) => setMessage({ type: "error", text: err.response?.data?.message || err.message }))
        .finally(() => setSaving(false));
    };

    if (existing) {
      finish(existing._id);
    } else {
      // auto-create the plot, then save its coordinates
      api
        .post(`/admin/projects/${id}/plots`, {
          plot_number: form.number,
          total_area: form.total_area || 0.01,
          price_per_sqft: form.price_per_sqft || 0,
          plc_percent: form.plc_percent || 0,
          status: form.status || "available",
          facing: form.facing,
          zone_type: form.zone_type,
          corner_plot: form.corner_plot,
          boundary_n: form.boundary_n,
          boundary_s: form.boundary_s,
          boundary_e: form.boundary_e,
          boundary_w: form.boundary_w,
        })
        .then((res) => finish(res.data.data._id))
        .catch((err) => {
          setMessage({ type: "error", text: err.response?.data?.errors ? Object.values(err.response.data.errors).join(", ") : err.response?.data?.message || err.message });
          setSaving(false);
        });
    }
  };

  return (
    <div className="d-flex flex-column" style={{ minHeight: "calc(100vh - 130px)" }}>
      <div className="page-title-box d-flex align-items-center justify-content-between mb-3">
        <div>
          <h4 className="page-title mb-1">
            <iconify-icon icon="solar:map-point-wave-bold-duotone" className="me-2 fs-22 text-primary align-middle"></iconify-icon>
            Plot Mapper
          </h4>
          <p className="text-muted mb-0">
            Click two opposite corners on the image, enter a plot number, then save. If the number is new, the plot will be created automatically.
          </p>
        </div>
        <div className="d-flex gap-3 align-items-center">
          <div className="text-center"><div className="fw-bold">{stats.traced}</div><small className="text-muted">Traced</small></div>
          <div className="text-center"><div className="fw-bold text-success">{stats.available}</div><small className="text-muted">Available</small></div>
          <div className="text-center"><div className="fw-bold text-warning">{stats.booked}</div><small className="text-muted">Booked</small></div>
          <div className="text-center"><div className="fw-bold text-danger">{stats.sold}</div><small className="text-muted">Sold</small></div>
          <Link to={`/admin/projects/${id}/map`} className="btn btn-light">Back</Link>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"} py-2`}>{message.text}</div>
      )}

      {!imageUrl ? (
        <div className="card shadow-sm border-0">
          <div className="card-body text-center py-5">
            <h5>This project has no map image</h5>
            <p className="text-muted">Upload any image you want to use, such as a layout, satellite view, or scanned drawing.</p>
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
          </div>
        </div>
      ) : (
        <div className="row g-3 flex-grow-1">
          <div className="col-md-3">
            <div className="card shadow-sm border-0 mb-3">
              <div className="card-body">
                <div className="fw-bold mb-2">Upload CSV — bulk autofill</div>
                <input type="file" accept=".csv" onChange={handleCsvFile} className="form-control form-control-sm mb-1" />
                <div className="text-muted small">
                 Columns: number, total_area, price_per_sqft, status, plc_percent. Fields auto-fill as soon as you enter the number.                  {csvCount > 0 && ` (${csvCount} rows loaded)`}
                </div>
                {csvCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger mt-1"
                    onClick={() => {
                      setCsvData({});
                      setCsvCount(0);
                      setMessage({ type: "success", text: "CSV data cleared." });
                    }}
                  >
                    Clear CSV data
                  </button>
                )}
                <hr />
                <label className="form-label small mb-1">Replace the map image:</label>
                <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="form-control form-control-sm" />
              </div>
            </div>

            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="fw-bold mb-2">Mapped plots ({mappedPlots.length}/{plots.length})</div>
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {mappedPlots.map((p) => (
                    <div key={p._id} className="d-flex align-items-center gap-2 mb-1">
                      <span className="d-inline-block" style={{ width: 10, height: 10, background: statusColor(p.status), borderRadius: 2 }} />
                      #{p.plotNumber}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-9">
            <div className="card shadow-sm border-0">
              <div className="card-body p-0" style={{ position: "relative", overflow: "auto" }}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img
                    ref={imgRef}
                    src={imageUrl}
                    alt="Project layout"
                    style={{ maxWidth: "100%", display: "block", cursor: "crosshair" }}
                    onLoad={(e) => setImgNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                    onClick={handleImageClick}
                  />

                  {imgNatural.w > 0 &&
                    mappedPlots
                      .slice()
                      .sort((a, b) => {
                        // draw smaller plots on top so overlapping big/small boxes stay clickable & legible
                        const ra = latLngsToRect(a.mapCoordinates.latlngs, imgNatural.w, imgNatural.h);
                        const rb = latLngsToRect(b.mapCoordinates.latlngs, imgNatural.w, imgNatural.h);
                        return rb.w * rb.h - ra.w * ra.h;
                      })
                      .map((p, idx) => {
                        const r = latLngsToRect(p.mapCoordinates.latlngs, imgNatural.w, imgNatural.h);
                        const scale = imgRef.current ? imgRef.current.clientWidth / imgNatural.w : 1;
                        const interactive = !draft && !pendingRect;
                        return (
                          <div
                            key={p._id}
                            onClick={(e) => {
                              if (!interactive) return;
                              e.stopPropagation();
                              setPreviewPlot(p);
                            }}
                            style={{
                              position: "absolute",
                              left: r.x * scale,
                              top: r.y * scale,
                              width: r.w * scale,
                              height: r.h * scale,
                              zIndex: idx + 1,
                              border: `1.5px solid ${statusColor(p.status)}`,
                              background: `${statusColor(p.status)}33`,
                              pointerEvents: interactive ? "auto" : "none",
                              cursor: interactive ? "pointer" : "default",
                              fontSize: 10,
                              lineHeight: 1,
                              color: "#111",
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              textShadow: "0 0 3px #fff, 0 0 3px #fff",
                              transition: "background 0.15s, box-shadow 0.15s",
                              boxShadow: "inset 0 0 0 9999px rgba(255,255,255,0)",
                            }}
                            onMouseEnter={(e) => {
                              if (!interactive) return;
                              e.currentTarget.style.background = `${statusColor(p.status)}77`;
                              e.currentTarget.style.zIndex = 999;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = `${statusColor(p.status)}33`;
                              e.currentTarget.style.zIndex = idx + 1;
                            }}
                            title={`Plot #${p.plotNumber} — ${p.status}`}
                          />
                        );
                      })}

                  {draft && imgRef.current && (
                    <div
                      style={{
                        position: "absolute",
                        left: (draft.x / imgNatural.w) * imgRef.current.clientWidth - 4,
                        top: (draft.y / imgNatural.h) * imgRef.current.clientHeight - 4,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#c9a24b",
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {pendingRect && imgRef.current && (
                    <div
                      style={{
                        position: "absolute",
                        left: (pendingRect.x / imgNatural.w) * imgRef.current.clientWidth,
                        top: (pendingRect.y / imgNatural.h) * imgRef.current.clientHeight,
                        width: (pendingRect.w / imgNatural.w) * imgRef.current.clientWidth,
                        height: (pendingRect.h / imgNatural.h) * imgRef.current.clientHeight,
                        border: "2px dashed #c9a24b",
                        background: "#c9a24b33",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingRect && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">New plot</h5>
                <button className="btn-close" onClick={cancelDraft}></button>
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label">Plot Number</label>
                  <input
                    autoFocus
                    className="form-control"
                    value={form.number}
                    onChange={(e) => handleNumberChange(e.target.value)}
                  />
                </div>
                <div className="row">
                  <div className="col-6 mb-2">
                    <label className="form-label">Total Area (sqft)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.total_area}
                      onChange={(e) => setForm((f) => ({ ...f, total_area: e.target.value }))}
                    />
                  </div>
                  <div className="col-6 mb-2">
                    <label className="form-label">Price / sqft</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.price_per_sqft}
                      onChange={(e) => setForm((f) => ({ ...f, price_per_sqft: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="row">
                  <div className="col-6 mb-2">
                    <label className="form-label">Facing</label>
                    <input className="form-control" value={form.facing} onChange={(e) => setForm((f) => ({ ...f, facing: e.target.value }))} />
                  </div>
                  <div className="col-6 mb-2">
                    <label className="form-label">Zone Type</label>
                    <input className="form-control" value={form.zone_type} onChange={(e) => setForm((f) => ({ ...f, zone_type: e.target.value }))} />
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label">Corner Plot</label>
                  <input className="form-control" value={form.corner_plot} onChange={(e) => setForm((f) => ({ ...f, corner_plot: e.target.value }))} placeholder="yes / no" />
                </div>
                <div className="row">
                  <div className="col-6 mb-2">
                    <label className="form-label">Boundary N</label>
                    <input className="form-control" value={form.boundary_n} onChange={(e) => setForm((f) => ({ ...f, boundary_n: e.target.value }))} />
                  </div>
                  <div className="col-6 mb-2">
                    <label className="form-label">Boundary S</label>
                    <input className="form-control" value={form.boundary_s} onChange={(e) => setForm((f) => ({ ...f, boundary_s: e.target.value }))} />
                  </div>
                  <div className="col-6 mb-2">
                    <label className="form-label">Boundary E</label>
                    <input className="form-control" value={form.boundary_e} onChange={(e) => setForm((f) => ({ ...f, boundary_e: e.target.value }))} />
                  </div>
                  <div className="col-6 mb-2">
                    <label className="form-label">Boundary W</label>
                    <input className="form-control" value={form.boundary_w} onChange={(e) => setForm((f) => ({ ...f, boundary_w: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={cancelDraft}>Cancel</button>
                  <button
                  type="button"
                  className="btn btn-outline-primary"
                  disabled={!form.number.trim()}
                  onClick={() => setShowFormPreview(true)}
                >
                  Preview (what the agent will see)
                </button>
                <button className="btn btn-primary" onClick={savePlot} disabled={saving || !form.number.trim()}>
                  {saving ? "Saving..." : "Save plot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFormPreview && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.6)", zIndex: 1060 }} onClick={() => setShowFormPreview(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header" style={{ background: statusColor(form.status), color: "#fff" }}>
                <h5 className="modal-title">Plot #{form.number || "—"}</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowFormPreview(false)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">The agent or customer will see these exact details when they open this plot.</p>
                <div className="row g-2">
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Total Area</small>
                      <span className="fw-bold">{form.total_area ? `${Number(form.total_area).toLocaleString()} sqft` : "—"}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Price / sqft</small>
                      <span className="fw-bold">{form.price_per_sqft ? `₹${Number(form.price_per_sqft).toLocaleString()}` : "—"}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Status</small>
                      <span className="fw-bold text-capitalize" style={{ color: statusColor(form.status) }}>{form.status}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">PLC %</small>
                      <span className="fw-bold">{form.plc_percent ? `${Number(form.plc_percent)}%` : "—"}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Facing</small>
                      <span className="fw-bold">{form.facing || "—"}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Zone Type</small>
                      <span className="fw-bold">{form.zone_type || "—"}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Corner Plot</small>
                      <span className="fw-bold">{form.corner_plot || "—"}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Boundaries</small>
                      <span className="fw-bold small">
                        N: {form.boundary_n || "—"} · S: {form.boundary_s || "—"} · E: {form.boundary_e || "—"} · W: {form.boundary_w || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={() => setShowFormPreview(false)}>Close Preview</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewPlot && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setPreviewPlot(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Plot #{previewPlot.plotNumber}</h5>
                <button className="btn-close" onClick={() => setPreviewPlot(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Total Area</small>
                      <span className="fw-bold">{Number(previewPlot.totalArea).toLocaleString()} sqft</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Price / sqft</small>
                      <span className="fw-bold">₹{Number(previewPlot.pricePerSqft || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Status</small>
                      <span className="fw-bold text-capitalize" style={{ color: statusColor(previewPlot.status) }}>{previewPlot.status}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">PLC %</small>
                      <span className="fw-bold">{Number(previewPlot.plcPercent || 0)}%</span>                    </div>
                  </div>
                  {previewPlot.facing && (
                    <div className="col-6">
                      <div className="bg-light rounded p-2 text-center">
                        <small className="text-muted d-block">Facing</small>
                        <span className="fw-bold">{previewPlot.facing}</span>
                      </div>
                    </div>
                  )}
                  {previewPlot.zoneType && (
                    <div className="col-6">
                      <div className="bg-light rounded p-2 text-center">
                        <small className="text-muted d-block">Zone Type</small>
                        <span className="fw-bold">{previewPlot.zoneType}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={() => setPreviewPlot(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlotMapper;