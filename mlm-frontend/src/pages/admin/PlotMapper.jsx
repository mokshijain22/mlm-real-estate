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
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return {};
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const map = {};
  lines.slice(1).forEach((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] || "").trim()));
    const number = row.number || row.plot_number || row.plotnumber;
    if (!number) return;
    map[number] = {
      total_area: row.total_area || row.area || "",
      price_per_sqft: row.price_per_sqft || row.price || "",
      status: STATUSES.includes(row.status) ? row.status : "",
      plc_amount: row.plc_amount || "",
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
  const [form, setForm] = useState({ number: "", total_area: "", price_per_sqft: "", status: "available", plc_amount: "" });

  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

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
      setMessage({ type: "success", text: `CSV loaded: ${Object.keys(map).length} plot rows. Ab number type karte hi auto-fill hoga.` });
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
    setForm({ number: "", total_area: "", price_per_sqft: "", status: "available", plc_amount: "" });
  };

  const cancelDraft = () => {
    setDraft(null);
    setPendingRect(null);
  };

  const handleNumberChange = (value) => {
    const existing = plots.find((p) => String(p.plotNumber) === String(value));
    const csvRow = csvData[value];
    setForm((f) => ({
      ...f,
      number: value,
      total_area: existing ? existing.totalArea : csvRow?.total_area || f.total_area,
      price_per_sqft: existing ? existing.pricePerSqft : csvRow?.price_per_sqft || f.price_per_sqft,
      status: existing ? existing.status : csvRow?.status || f.status,
      plc_amount: existing ? existing.plcAmount || "" : csvRow?.plc_amount || f.plc_amount,
    }));
  };

  const savePlot = () => {
    if (!form.number.trim() || !pendingRect) {
      setMessage({ type: "error", text: "Plot number likho." });
      return;
    }
    const latlngs = rectToLatLngs(pendingRect.x, pendingRect.y, pendingRect.w, pendingRect.h, imgNatural.w, imgNatural.h);
    const existing = plots.find((p) => String(p.plotNumber) === String(form.number));
    setSaving(true);

    const finish = (plotId) => {
      api
        .post(`/admin/projects/${id}/layout`, { plots: { [plotId]: { latlngs } } })
        .then(() => {
          setMessage({ type: "success", text: `Plot #${form.number} traced & saved.` });
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
          plc_amount: form.plc_amount || 0,
          status: form.status || "available",
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
            Image pe do opposite corners click karo → plot number likho → save. Nayi number ho to plot khud ban jayega.
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
            <h5>Is project ka koi map image nahi hai</h5>
            <p className="text-muted">Layout, satellite ya scanned drawing — koi bhi image upload karo.</p>
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
                  Columns: number, total_area, price_per_sqft, status, plc_amount. Number type karte hi auto-fill hoga.
                  {csvCount > 0 && ` (${csvCount} rows loaded)`}
                </div>
                <hr />
                <label className="form-label small mb-1">Map image badalni ho:</label>
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
                    mappedPlots.map((p) => {
                      const r = latLngsToRect(p.mapCoordinates.latlngs, imgNatural.w, imgNatural.h);
                      const scale = imgRef.current ? imgRef.current.clientWidth / imgNatural.w : 1;
                      return (
                        <div
                          key={p._id}
                          style={{
                            position: "absolute",
                            left: r.x * scale,
                            top: r.y * scale,
                            width: r.w * scale,
                            height: r.h * scale,
                            border: `2px solid ${statusColor(p.status)}`,
                            background: `${statusColor(p.status)}55`,
                            pointerEvents: "none",
                            fontSize: 11,
                            color: "#111",
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {p.plotNumber}
                        </div>
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
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={cancelDraft}>Cancel</button>
                <button className="btn btn-primary" onClick={savePlot} disabled={saving || !form.number.trim()}>
                  {saving ? "Saving..." : "Save plot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlotMapper;