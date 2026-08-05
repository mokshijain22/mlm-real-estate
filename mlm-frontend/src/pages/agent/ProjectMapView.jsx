import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../api/axios.js";

const STORAGE_BASE = "http://localhost:5000";

function getStatusBorder(status) {
  return status === "available" ? "#10b981" : status === "booked" ? "#f59e0b" : "#ef4444";
}
function getStatusFill(status) {
  return status === "available" ? "#d1fae5" : status === "booked" ? "#fef3c7" : "#fee2e2";
}

function ProjectMapView() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState(null);
  const [error, setError] = useState(null);
  const [previewPlot, setPreviewPlot] = useState(null);
  const [svgContent, setSvgContent] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const svgContainerRef = useRef(null);

  useEffect(() => {
    api
      .get(`/agent/projects/${id}/map`)
      .then((res) => {
        setProject(res.data.project);
        setPlots(res.data.plots || []);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [id]);

  const hasProfessionalLayout = plots ? plots.some((p) => p.mapCoordinates?.latlngs) : false;

  // Leaflet real-image / traced view
  useEffect(() => {
    if (!plots || !project || !hasProfessionalLayout || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      minZoom: -1,
      maxZoom: 4,
      attributionControl: false,
      // agent/customer: view only — no drawing/edit tools
    });
    mapInstanceRef.current = map;
    map.fitBounds([[0, 0], [1000, 1000]]);

    if (project?.mapData?.imageUrl) {
      L.imageOverlay(`${STORAGE_BASE}/storage/${project.mapData.imageUrl}`, [
        [0, 0],
        [1000, 1000],
      ]).addTo(map);
    }

    const group = L.featureGroup();
    plots.forEach((plot) => {
      if (plot.mapCoordinates?.latlngs) {
        const layer = L.polygon(plot.mapCoordinates.latlngs, {
          color: getStatusBorder(plot.status),
          fillColor: getStatusFill(plot.status),
          fillOpacity: 0.7,
          interactive: true,
        }).addTo(map);
        group.addLayer(layer);
        layer.bindTooltip(`Plot #${plot.plotNumber} • ${plot.status.toUpperCase()}`, {
          permanent: false,
          direction: "top",
        });
        layer.on("click", () => setPreviewPlot(plot));
      }
    });

    if (group.getLayers().length > 0) map.fitBounds(group.getBounds().pad(0.2));

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [plots, project, hasProfessionalLayout]);

  // SVG grid fallback — used whenever nothing's been hand-traced yet
  useEffect(() => {
    if (!project || hasProfessionalLayout || !project.layoutSvg) return;
    fetch(`${STORAGE_BASE}/storage/${project.layoutSvg}`)
      .then((res) => res.text())
      .then((text) => setSvgContent(text))
      .catch(() => setSvgContent(null));
  }, [project, hasProfessionalLayout]);

  useEffect(() => {
    if (!svgContent || !svgContainerRef.current || !plots) return;
    plots.forEach((plot) => {
      const el = svgContainerRef.current.querySelector(`#plot-${CSS.escape(plot.plotNumber)}`);
      if (el) {
        el.style.cursor = "pointer";
        el.onclick = () => setPreviewPlot(plot);
      }
    });
  }, [svgContent, plots]);

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="d-flex flex-column" style={{ minHeight: "calc(100vh - 130px)" }}>
      <div className="page-title-box d-flex align-items-center justify-content-between mb-3">
        <div>
          <h4 className="page-title mb-1">{project?.name} — Layout Map</h4>
          <p className="text-muted mb-0">Plot pe click karke details dekho. Available / Booked / Sold status shown live.</p>
        </div>
        <Link to={`/agent/projects/${id}`} className="btn btn-light">Back</Link>
      </div>
      <div className="card shadow-sm border-0 flex-grow-1 mb-0">
        <div className="card-body p-0">
          {!plots || plots.length === 0 ? (
            <div className="text-center py-5">
              <iconify-icon icon="solar:map-point-linear" className="text-muted" style={{ fontSize: 64 }}></iconify-icon>
              <p className="mt-3 text-muted">No plots found for this project.</p>
            </div>
          ) : hasProfessionalLayout ? (
            <div ref={mapRef} style={{ minHeight: "calc(100vh - 235px)" }} />
          ) : project?.layoutSvg ? (
            <div className="plot-map-container p-3" style={{ background: "#f8fafc", borderRadius: 12, minHeight: 400 }}>
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
              <p className="text-muted">Layout not designed yet.</p>
            </div>
          )}
        </div>
      </div>

      {previewPlot && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setPreviewPlot(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header" style={{ background: getStatusBorder(previewPlot.status), color: "#fff" }}>
                <h5 className="modal-title">Plot #{previewPlot.plotNumber}</h5>
                <button className="btn-close btn-close-white" onClick={() => setPreviewPlot(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-2">
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Total Area</small>
                      <span className="fw-bold">{previewPlot.totalArea ? `${Number(previewPlot.totalArea).toLocaleString()} sqft` : "—"}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Price / sqft</small>
                      <span className="fw-bold">{previewPlot.pricePerSqft ? `₹${Number(previewPlot.pricePerSqft).toLocaleString()}` : "—"}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                      <small className="text-muted d-block">Status</small>
                      <span className="fw-bold text-capitalize" style={{ color: getStatusBorder(previewPlot.status) }}>{previewPlot.status}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light rounded p-2 text-center">
                       <small className="text-muted d-block">PLC %</small>
                      <span className="fw-bold">{previewPlot.plcPercent ? `${Number(previewPlot.plcPercent)}%` : "—"}</span>                    </div>
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
                {previewPlot.status === "available" && (
                  <Link to={`/agent/bookings/new?plot_id=${previewPlot._id}`} className="btn btn-primary">
                    Book this Plot
                  </Link>
                )}
                <button className="btn btn-light" onClick={() => setPreviewPlot(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectMapView;