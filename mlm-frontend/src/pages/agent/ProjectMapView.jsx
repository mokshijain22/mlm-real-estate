import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../api/axios.js";

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
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    api
      .get(`/agent/projects/${id}/map`)
      .then((res) => {
        setProject(res.data.project);
        setPlots(res.data.plots || []);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [id]);

  useEffect(() => {
    if (!plots || !project || !mapRef.current || mapInstanceRef.current) return;
    const hasLayout = plots.some((p) => p.mapCoordinates?.latlngs) || project?.mapData?.imageUrl;
    if (!hasLayout) return;

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
          interactive: false, // no click-to-edit for agent
        }).addTo(map);
        group.addLayer(layer);
        layer.bindTooltip(`Plot #${plot.plotNumber} • ${plot.status.toUpperCase()}`, {
          permanent: false,
          direction: "top",
        });
      }
    });

    if (group.getLayers().length > 0) map.fitBounds(group.getBounds().pad(0.2));

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [plots, project]);
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="d-flex flex-column" style={{ minHeight: "calc(100vh - 130px)" }}>
      <div className="page-title-box d-flex align-items-center justify-content-between mb-3">
        <div>
          <h4 className="page-title mb-1">{project?.name} — Layout Map</h4>
          <p className="text-muted mb-0">View only. Available / Booked / Sold status shown live.</p>
        </div>
        <Link to={`/agent/projects/${id}`} className="btn btn-light">Back</Link>
      </div>
      <div className="card shadow-sm border-0 flex-grow-1 mb-0">
        <div className="card-body p-0">
          <div ref={mapRef} style={{ minHeight: "calc(100vh - 235px)" }} />
        </div>
      </div>
    </div>
  );
}

export default ProjectMapView;