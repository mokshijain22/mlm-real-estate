import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import api from "../../api/axios.js";

const STORAGE_BASE = "http://localhost:5000";

function getStatusBorder(status) {
  return status === "available" ? "#10b981" : status === "booked" ? "#f59e0b" : "#ef4444";
}
function getStatusFill(status) {
  return status === "available" ? "#d1fae5" : status === "booked" ? "#fef3c7" : "#fee2e2";
}

function ProjectMap() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("map"); // "map" | "grid"
  const [fullscreen, setFullscreen] = useState(false);
  const [svgContent, setSvgContent] = useState(null);

  const [modalPlot, setModalPlot] = useState(null);
  const [modalStatus, setModalStatus] = useState("available");
  const [modalError, setModalError] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const svgContainerRef = useRef(null);

  const load = () => {
    api
      .get(`/admin/projects/${id}/map`)
      .then((res) => {
        setProject(res.data.project);
        setPlots(res.data.plots);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const hasProfessionalLayout = plots ? plots.some((p) => p.mapCoordinates) : false;

  // Leaflet professional map
  useEffect(() => {
    if (!plots || !hasProfessionalLayout || view !== "map") return;
    if (!mapRef.current) return;

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      minZoom: -1,
      maxZoom: 4,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    map.fitBounds([
      [0, 0],
      [1000, 1000],
    ]);

    const group = L.featureGroup();

    plots.forEach((plot) => {
      if (plot.mapCoordinates && plot.mapCoordinates.latlngs) {
        const layer = L.polygon(plot.mapCoordinates.latlngs, {
          color: getStatusBorder(plot.status),
          fillColor: getStatusFill(plot.status),
          fillOpacity: 0.7,
        }).addTo(map);
        group.addLayer(layer);

        layer
          .bindTooltip(`Plot #${plot.plotNumber}`, {
            permanent: true,
            direction: "center",
            className: "plot-label",
          })
          .openTooltip();

        layer.on("click", () => openStatusModal(plot));

        layer.on("add", () => {
          const el = layer.getElement();
          if (el) {
            tippy(el, {
              content: `<strong>Plot #${plot.plotNumber}</strong><br>Area: ${Number(plot.totalArea).toLocaleString()} sqft<br>Price: ₹${Number(plot.pricePerSqft).toLocaleString()}/sqft<br>Status: ${plot.status.toUpperCase()}`,
              allowHTML: true,
              theme: "plot",
            });
          }
        });
      }
    });

    if (group.getLayers().length > 0) {
      map.fitBounds(group.getBounds().pad(0.2));
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plots, hasProfessionalLayout, view]);

  // Invalidate size on fullscreen toggle
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current.invalidateSize(), 300);
    }
  }, [fullscreen]);

  // SVG fallback: fetch raw svg and inject, attach click handlers
  useEffect(() => {
    if (!project || hasProfessionalLayout || !project.layoutSvg || view !== "map") return;
    fetch(`${STORAGE_BASE}/storage/${project.layoutSvg}`)
      .then((res) => res.text())
      .then((text) => setSvgContent(text))
      .catch(() => setSvgContent(null));
  }, [project, hasProfessionalLayout, view]);

  useEffect(() => {
    if (!svgContent || !svgContainerRef.current || !plots) return;
    plots.forEach((plot) => {
      const el = svgContainerRef.current.querySelector(`#plot-${CSS.escape(plot.plotNumber)}`);
      if (el) {
        el.style.cursor = "pointer";
        el.onclick = () => openStatusModal(plot);
        tippy(el, {
          content: `<strong>Plot #${plot.plotNumber}</strong><br>Area: ${Number(plot.totalArea).toLocaleString()} sqft<br>Price: ₹${Number(plot.pricePerSqft).toLocaleString()}/sqft<br>Status: ${plot.status.toUpperCase()}`,
          allowHTML: true,
          theme: "plot",
        });
      }
    });
  }, [svgContent, plots]);

  const openStatusModal = (plot) => {
    setModalPlot(plot);
    setModalStatus(plot.status);
    setModalError(null);
  };

  const closeModal = () => setModalPlot(null);

  const handleUpdateStatus = () => {
    setModalSaving(true);
    setModalError(null);
    api
      .patch(`/admin/plots/${modalPlot._id}/status`, { status: modalStatus })
      .then(() => {
        closeModal();
        load();
      })
      .catch((err) => {
        setModalError(err.response?.data?.message || err.response?.data?.errors?.status || err.message);
      })
      .finally(() => setModalSaving(false));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!project || !plots) return <div className="text-center py-5">Loading...</div>;

  const available = plots.filter((p) => p.status === "available").length;
  const booked = plots.filter((p) => p.status === "booked").length;
  const sold = plots.filter((p) => p.status === "sold").length;
  const total = plots.length;

  return (
    <>
      <div className="row mb-3">
        <div className="col-12">
          <div className="page-title-box d-flex align-items-center justify-content-between">
            <div>
              <h4 className="page-title mb-1">
                <iconify-icon icon="solar:map-arrow-right-bold-duotone" className="me-2 fs-22 text-primary align-middle"></iconify-icon>
                {project.name} — Digital Map
              </h4>
            </div>
            <div className="d-flex gap-2">
              <Link to={`/admin/projects/${id}/builder`} className="btn btn-outline-primary btn-sm">
                <iconify-icon icon="solar:pen-new-square-bold-duotone" className="align-middle me-1 fs-16"></iconify-icon>
                Build Layout
              </Link>
              <div className="btn-group btn-group-sm me-2">
                <button
                  type="button"
                  className={`btn btn-outline-primary ${view === "map" ? "active" : ""}`}
                  onClick={() => setView("map")}
                >
                  <iconify-icon icon="solar:map-bold-duotone" className="align-middle"></iconify-icon> Visual Map
                </button>
                <button
                  type="button"
                  className={`btn btn-outline-primary ${view === "grid" ? "active" : ""}`}
                  onClick={() => {
                    setView("grid");
                    setFullscreen(false);
                  }}
                >
                  <iconify-icon icon="solar:widget-3-bold-duotone" className="align-middle"></iconify-icon> Grid View
                </button>
              </div>
              <Link to={`/admin/projects/${id}/plots/create`} className="btn btn-primary btn-sm">
                <iconify-icon icon="solar:add-circle-bold-duotone" className="align-middle me-1 fs-16"></iconify-icon>
                Add Plot
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-3 g-2">
        <div className="col-6 col-md-3">
          <div className="card mb-0 shadow-sm border-0">
            <div className="card-body py-2 px-3 d-flex align-items-center gap-3">
              <span style={{ width: 12, height: 12, background: "#10b981", borderRadius: "50%" }}></span>
              <div>
                <div className="fw-bold fs-5 mb-0">{available}</div>
                <div className="text-muted small">Available</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card mb-0 shadow-sm border-0">
            <div className="card-body py-2 px-3 d-flex align-items-center gap-3">
              <span style={{ width: 12, height: 12, background: "#f59e0b", borderRadius: "50%" }}></span>
              <div>
                <div className="fw-bold fs-5 mb-0">{booked}</div>
                <div className="text-muted small">Booked</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card mb-0 shadow-sm border-0">
            <div className="card-body py-2 px-3 d-flex align-items-center gap-3">
              <span style={{ width: 12, height: 12, background: "#ef4444", borderRadius: "50%" }}></span>
              <div>
                <div className="fw-bold fs-5 mb-0">{sold}</div>
                <div className="text-muted small">Sold</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card mb-0 shadow-sm border-0">
            <div className="card-body py-2 px-3 d-flex align-items-center gap-3">
              <span style={{ width: 12, height: 12, background: "#6c757d", borderRadius: "50%" }}></span>
              <div>
                <div className="fw-bold fs-5 mb-0">{total}</div>
                <div className="text-muted small">Total Plots</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="card shadow-sm border-0"
        style={
          fullscreen
            ? { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9999, background: "white", overflow: "auto" }
            : {}
        }
      >
        <div className="card-body">
          {plots.length === 0 ? (
            <div className="text-center py-5">
              <iconify-icon icon="solar:map-point-linear" className="text-muted" style={{ fontSize: 64 }}></iconify-icon>
              <p className="mt-3 text-muted">No plots found for this project.</p>
            </div>
          ) : view === "map" ? (
            <div>
              <div className="d-flex justify-content-end mb-2">
                <button className="btn btn-sm btn-light border" onClick={() => setFullscreen((f) => !f)}>
                  <iconify-icon icon="solar:full-screen-bold-duotone" className="align-middle me-1"></iconify-icon>
                  {fullscreen ? "Exit Full Screen" : "Full Screen"}
                </button>
              </div>
              {hasProfessionalLayout ? (
                <div
                  ref={mapRef}
                  style={{
                    height: fullscreen ? "calc(100vh - 80px)" : 600,
                    width: "100%",
                    background: "#f1f5f9",
                    borderRadius: 12,
                  }}
                ></div>
              ) : project.layoutSvg ? (
                <div
                  className="plot-map-container"
                  style={{ background: "#f8fafc", borderRadius: 12, minHeight: 400, padding: 20 }}
                >
                  <div
                    ref={svgContainerRef}
                    className="svg-wrapper"
                    style={{ maxWidth: "100%", height: "auto" }}
                    dangerouslySetInnerHTML={{ __html: svgContent || "" }}
                  />
                </div>
              ) : (
                <div className="text-center py-5">
                  <iconify-icon icon="solar:map-linear" className="text-muted" style={{ fontSize: 48 }}></iconify-icon>
                  <p className="text-muted">Layout not designed yet. Click "Build Layout" to start.</p>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 14,
                width: "100%",
              }}
            >
              {plots.map((plot) => {
                const colorMap = {
                  available: { background: "#d1fae5", borderColor: "#10b981" },
                  booked: { background: "#fef3c7", borderColor: "#f59e0b" },
                  sold: { background: "#fee2e2", borderColor: "#ef4444" },
                };
                const c = colorMap[plot.status] || colorMap.available;
                return (
                  <div
                    key={plot._id}
                    onClick={() => openStatusModal(plot)}
                    style={{
                      borderRadius: 10,
                      padding: "16px 12px",
                      textAlign: "center",
                      cursor: "pointer",
                      border: `2px solid ${c.borderColor}`,
                      background: c.background,
                    }}
                  >
                    <div className="fw-bold">{plot.plotNumber}</div>
                    <div className="small">{Number(plot.totalArea).toLocaleString(undefined, { maximumFractionDigits: 0 })} sqft</div>
                    <div className="small text-capitalize">{plot.status}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {modalPlot && (
        <>
          <div className="modal fade show" style={{ display: "block" }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header border-bottom-0">
                  <h5 className="modal-title">Plot #{modalPlot.plotNumber} Details</h5>
                  <button type="button" className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3 mb-4">
                    <div className="col-6">
                      <div className="bg-light rounded p-2 text-center">
                        <small className="text-muted d-block">Area</small>
                        <span className="fw-bold">{Number(modalPlot.totalArea).toLocaleString()} sqft</span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light rounded p-2 text-center">
                        <small className="text-muted d-block">Price / sqft</small>
                        <span className="fw-bold">₹{Number(modalPlot.pricePerSqft).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Change Status</label>
                    <select className="form-select" value={modalStatus} onChange={(e) => setModalStatus(e.target.value)}>
                      <option value="available">Available 🟢</option>
                      <option value="booked">Booked 🟡</option>
                      <option value="sold">Sold 🔴</option>
                    </select>
                  </div>
                  {modalError && <div className="alert alert-danger">{modalError}</div>}
                </div>
                <div className="modal-footer border-top-0">
                  <button type="button" className="btn btn-light" onClick={closeModal}>
                    Close
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleUpdateStatus} disabled={modalSaving}>
                    {modalSaving ? "Updating..." : "Update Status"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeModal}></div>
        </>
      )}
    </>
  );
}

export default ProjectMap;