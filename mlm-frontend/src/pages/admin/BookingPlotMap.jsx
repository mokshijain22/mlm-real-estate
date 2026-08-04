import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../api/axios.js";

const STORAGE_BASE = "http://localhost:5000";

function getStatusBorder(status, isSelected) {
  if (isSelected) return "#2563eb"; // blue highlight for the currently selected plot
  return status === "available" ? "#10b981" : status === "booked" ? "#f59e0b" : "#ef4444";
}
function getStatusFill(status, isSelected) {
  if (isSelected) return "#bfdbfe";
  return status === "available" ? "#d1fae5" : status === "booked" ? "#fef3c7" : "#fee2e2";
}

function BookingPlotMap({ projectId, plotId, onSelectPlot }) {
  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState(null);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({}); // plotId -> leaflet layer

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setPlots(null);
      return;
    }
    api
      .get(`/admin/projects/${projectId}/map`)
      .then((res) => {
        setProject(res.data.project);
        setPlots(res.data.plots || []);
        setError(null);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [projectId]);

  const hasProfessionalLayout = plots ? plots.some((p) => p.mapCoordinates) : false;

  // Build the map once plots with coordinates are loaded
  useEffect(() => {
    if (!plots || !hasProfessionalLayout || !mapRef.current) return;

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      minZoom: -1,
      maxZoom: 4,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;
    map.fitBounds([
      [0, 0],
      [1000, 1000],
    ]);

    if (project?.mapData?.imageUrl) {
      L.imageOverlay(`${STORAGE_BASE}/storage/${project.mapData.imageUrl}`, [
        [0, 0],
        [1000, 1000],
      ]).addTo(map);
    }

    const group = L.featureGroup();
    layersRef.current = {};

    plots.forEach((plot) => {
      if (plot.mapCoordinates && plot.mapCoordinates.latlngs) {
        const isSelected = plot._id === plotId;
        const layer = L.polygon(plot.mapCoordinates.latlngs, {
          color: getStatusBorder(plot.status, isSelected),
          fillColor: getStatusFill(plot.status, isSelected),
          fillOpacity: isSelected ? 0.85 : 0.6,
          weight: isSelected ? 3 : 1,
        }).addTo(map);
        group.addLayer(layer);
        layersRef.current[plot._id] = layer;

        layer.bindTooltip(`Plot #${plot.plotNumber}`, {
          permanent: true,
          direction: "center",
          className: "plot-label",
        });

        if (plot.status === "available") {
          layer.on("click", () => onSelectPlot(plot._id));
        }
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
  }, [plots, hasProfessionalLayout, project]);

  // Re-highlight the selected plot without rebuilding the whole map
  useEffect(() => {
    if (!plots) return;
    plots.forEach((plot) => {
      const layer = layersRef.current[plot._id];
      if (!layer) return;
      const isSelected = plot._id === plotId;
      layer.setStyle({
        color: getStatusBorder(plot.status, isSelected),
        fillColor: getStatusFill(plot.status, isSelected),
        fillOpacity: isSelected ? 0.85 : 0.6,
        weight: isSelected ? 3 : 1,
      });
      if (isSelected) layer.bringToFront();
    });
  }, [plotId, plots]);

  if (!projectId) return null;
  if (error) return <div className="alert alert-warning small mb-3">Map unavailable: {error}</div>;
  if (!plots) return <div className="text-muted small mb-3">Loading map…</div>;

  if (!hasProfessionalLayout) {
    // No digital layout drawn yet for this project — fall back to a simple grid
    return (
      <div className="card bg-light border-0 mb-3">
        <div className="card-body py-3">
          <h6 className="mb-2 small text-uppercase text-muted">Plots</h6>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
            {plots.map((plot) => {
              const isSelected = plot._id === plotId;
              const colorMap = {
                available: { background: "#d1fae5", borderColor: "#10b981" },
                booked: { background: "#fef3c7", borderColor: "#f59e0b" },
                sold: { background: "#fee2e2", borderColor: "#ef4444" },
              };
              const c = colorMap[plot.status] || colorMap.available;
              return (
                <div
                  key={plot._id}
                  onClick={() => plot.status === "available" && onSelectPlot(plot._id)}
                  style={{
                    borderRadius: 8,
                    padding: "10px 6px",
                    textAlign: "center",
                    cursor: plot.status === "available" ? "pointer" : "not-allowed",
                    border: isSelected ? "3px solid #2563eb" : `2px solid ${c.borderColor}`,
                    background: isSelected ? "#bfdbfe" : c.background,
                    fontSize: 12,
                  }}
                >
                  <div className="fw-bold">{plot.plotNumber}</div>
                  <div className="text-capitalize">{plot.status}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-light border-0 mb-3">
      <div className="card-body py-2">
        <div ref={mapRef} style={{ height: 320, width: "100%", background: "#f1f5f9", borderRadius: 10 }}></div>
        <p className="text-muted small mb-0 mt-2">
          <span style={{ color: "#2563eb" }}>■</span> Selected &nbsp;
          <span style={{ color: "#10b981" }}>■</span> Available &nbsp;
          <span style={{ color: "#f59e0b" }}>■</span> Booked &nbsp;
          <span style={{ color: "#ef4444" }}>■</span> Sold
        </p>
      </div>
    </div>
  );
}

export default BookingPlotMap;