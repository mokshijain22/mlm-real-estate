import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import api from "../../api/axios.js";

function ProjectBuilder() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState(null);
  const [placedPlotIds, setPlacedPlotIds] = useState(new Set());
  const [activePlotId, setActivePlotId] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const selectedPlotIdRef = useRef(null);
  const plotDataRef = useRef([]);

  useEffect(() => {
    selectedPlotIdRef.current = activePlotId;
  }, [activePlotId]);

  // Load data
  useEffect(() => {
    api
      .get(`/admin/projects/${id}/builder`)
      .then((res) => {
        setProject(res.data.project);
        setPlots(res.data.plots);
        plotDataRef.current = res.data.plots;
        const placed = new Set(res.data.plots.filter((p) => p.mapCoordinates).map((p) => p._id));
        setPlacedPlotIds(placed);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [id]);

  // Init map once data loaded
  useEffect(() => {
    if (!project || !plots || !mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 4,
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;

    map.fitBounds([
      [0, 0],
      [1000, 1000],
    ]);

    map.pm.addControls({
      position: "topleft",
      drawCircle: false,
      drawMarker: false,
      drawCircleMarker: false,
      drawText: true,
      drawPolyline: true,
      removalMode: true,
    });

    function associatePlotWithLayer(layer, plotId) {
      const plot = plotDataRef.current.find((p) => p._id === plotId);
      layer.options.plotId = plotId;
      layer.setStyle({ color: "#10b981", fillColor: "#d1fae5", fillOpacity: 0.7 });
      if (plot) {
        layer
          .bindTooltip(`Plot #${plot.plotNumber}`, {
            permanent: true,
            direction: "center",
            className: "plot-label",
          })
          .openTooltip();
      }
      setPlacedPlotIds((prev) => new Set(prev).add(plotId));
      setActivePlotId(null);
      map.pm.disableDraw();
    }

    map.on("pm:create", (e) => {
      const layer = e.layer;
      const shape = e.shape;

      if (shape === "Polygon" || shape === "Rectangle") {
        if (selectedPlotIdRef.current) {
          associatePlotWithLayer(layer, selectedPlotIdRef.current);
        } else {
          layer.setStyle({ color: "#64748b", fillColor: "#94a3b8" });
        }
      } else if (shape === "Line") {
        layer.setStyle({ color: "#94a3b8", weight: 8, opacity: 0.5 });
      }
    });

    map.on("pm:remove", (e) => {
      const layer = e.layer;
      if (layer.options.plotId) {
        const removedId = layer.options.plotId;
        setPlacedPlotIds((prev) => {
          const next = new Set(prev);
          next.delete(removedId);
          return next;
        });
        layer.options.plotId = null;
      }
    });

    // Load existing layout
    const group = L.featureGroup();

    if (project.mapData && Array.isArray(project.mapData)) {
      project.mapData.forEach((item) => {
        const layer = L.geoJSON(item.geojson).addTo(map);
        group.addLayer(layer);
        if (item.type === "Line") {
          layer.setStyle({ color: "#94a3b8", weight: 8, opacity: 0.5 });
        }
      });
    }

    plots.forEach((plot) => {
      if (plot.mapCoordinates && plot.mapCoordinates.latlngs) {
        const layer = L.polygon(plot.mapCoordinates.latlngs).addTo(map);
        group.addLayer(layer);
        associatePlotWithLayer(layer, plot._id);
      }
    });

    if (group.getLayers().length > 0) {
      map.fitBounds(group.getBounds().pad(0.2));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, plots]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 300);
    }
  }, [fullscreen]);

  const handlePlotClick = (plotId) => {
    const map = mapRef.current;
    if (!map) return;

    if (activePlotId === plotId) {
      setActivePlotId(null);
      map.pm.disableDraw();
    } else {
      setActivePlotId(plotId);
      map.pm.enableDraw("Polygon", { snappable: true, snapDistance: 20 });
    }
  };

  const handleSave = () => {
    const map = mapRef.current;
    if (!map) return;

    setSaving(true);
    setError(null);

    const plotsPayload = {};
    const mapData = [];

    map.eachLayer((layer) => {
      if (layer.options && layer.options.plotId) {
        plotsPayload[layer.options.plotId] = { latlngs: layer.getLatLngs() };
      } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon) && layer.pm) {
        mapData.push({ type: "Line", geojson: layer.toGeoJSON() });
      }
    });

    api
      .post(`/admin/projects/${id}/layout`, { plots: plotsPayload, map_data: mapData })
      .then(() => {
        window.location.reload();
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
      })
      .finally(() => setSaving(false));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!project || !plots) return <div className="text-center py-5">Loading...</div>;

  return (
    <>
      <div className="row mb-3">
        <div className="col-12">
          <div className="page-title-box d-flex align-items-center justify-content-between">
            <div>
              <h4 className="page-title mb-1">
                <iconify-icon icon="solar:pen-new-square-bold-duotone" className="me-2 fs-22 text-primary align-middle"></iconify-icon>
                Map Builder: {project.name}
              </h4>
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setFullscreen((f) => !f)}>
                <iconify-icon icon="solar:full-screen-bold-duotone" className="align-middle me-1"></iconify-icon>
                {fullscreen ? "Exit Full Screen" : "Full Screen"}
              </button>
              <button type="button" className="btn btn-success" onClick={handleSave} disabled={saving}>
                <iconify-icon icon="solar:diskette-bold-duotone" className="align-middle me-1"></iconify-icon>
                {saving ? "Saving..." : "Save Layout"}
              </button>
              <Link to={`/admin/projects/${id}/map`} className="btn btn-light">
                <iconify-icon icon="solar:map-bold-duotone" className="align-middle me-1"></iconify-icon> View Map
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        className="project-builder row"
        style={
          fullscreen
            ? { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9999, background: "white", margin: 0, padding: 10, overflow: "auto" }
            : {}
        }
      >
        <div className="col-lg-3">
          <div className="project-builder-sidebar card shadow-sm border-0" style={{ height: 700, overflowY: "auto" }}>
            <div className="card-header bg-white border-bottom-0 pt-3">
              <h5 className="card-title mb-0">Unassigned Plots</h5>
              <p className="text-muted small mb-0">Select a plot below, then draw it on the map.</p>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {plots.map((plot) => {
                  const placed = placedPlotIds.has(plot._id);
                  const active = activePlotId === plot._id;
                  return (
                    <div
                      key={plot._id}
                      className={`list-group-item plot-item ${active ? "active" : ""} ${placed ? "placed" : ""}`}
                      style={{
                        cursor: "pointer",
                        borderLeft: active ? "4px solid #3b82f6" : "4px solid transparent",
                        backgroundColor: active ? "#eff6ff" : placed ? "#f1f5f9" : "",
                        opacity: placed ? 0.6 : 1,
                      }}
                      onClick={() => handlePlotClick(plot._id)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className="fw-bold">Plot #{plot.plotNumber}</span>
                          <div className="small text-muted">
                            {Number(plot.totalArea).toLocaleString(undefined, { maximumFractionDigits: 0 })} sqft
                          </div>
                        </div>
                        {placed && <iconify-icon icon="solar:check-read-linear" className="text-success fs-20"></iconify-icon>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-9">
          <div className="card shadow-sm border-0">
            <div className="card-body p-2">
              <div
                className="project-builder-map"
                ref={mapElRef}
                style={{
                  height: fullscreen ? "calc(100vh - 40px)" : 550,
                  width: "100%",
                  background: "#f1f5f9",
                  borderRadius: fullscreen ? 0 : 8,
                  cursor: "crosshair",
                }}
              ></div>
              <div className="project-builder-hints mt-2 d-flex gap-4 small text-muted px-2">
                <span>
                  <kbd>Click</kbd> to start drawing
                </span>
                <span>
                  <kbd>Double Click</kbd> to finish shape
                </span>
                <span>
                  <kbd>ESC</kbd> to cancel
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProjectBuilder;
