import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function isTower(projectType) {
  return projectType === "Apartment";
}

function Projects() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get("/agent/projects")
      .then((res) => setProjects(res.data.projects))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!projects) return <div className="text-center py-5">Loading...</div>;

  const filteredProjects = projects.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.location || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <h4 className="fw-bold mb-1">Projects</h4>
      <p className="text-muted mb-3 fs-13">Browse available real estate projects.</p>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="input-group" style={{ maxWidth: 320 }}>
            <span className="input-group-text bg-light border-end-0">
              <iconify-icon icon="solar:magnifer-linear"></iconify-icon>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search by project name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            {projects.length === 0 ? "No active projects available." : "No projects match your search."}
          </div>
        </div>
      ) : (
        <div className="row">
          {filteredProjects.map((p) => {
            const tower = isTower(p.projectType);
            const unitLabel = tower ? "Total Flats" : "Total Plots";
            const facilities = p.facilities || [];
            const landmark = (p.nearbyLandmarks || [])[0];

            return (
              <div className="col-md-6 col-xl-4 mb-4" key={p._id}>
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body p-4 d-flex flex-column">
                    <div className="d-flex align-items-start justify-content-between mb-1">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="d-flex align-items-center justify-content-center rounded"
                          style={{ width: 40, height: 40, background: "#fee9db" }}
                        >
                          <iconify-icon icon="solar:buildings-3-bold-duotone" className="fs-20 text-warning"></iconify-icon>
                        </div>
                        <h5 className="fw-bold mb-0">{p.name}</h5>
                      </div>
                      {tower && <span className="badge bg-secondary-subtle text-secondary flex-shrink-0">Tower</span>}
                    </div>
                    {p.description && <p className="fs-13 text-muted mb-2">{p.description}</p>}
                    <p className="fs-13 text-muted mb-3">{p.location || "—"}</p>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="bg-light rounded p-2">
                          <small className="text-muted d-block text-uppercase fs-11">{unitLabel}</small>
                          <span className="fw-bold fs-16">{p.plotsCount ?? 0}</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="bg-light rounded p-2">
                          <small className="text-muted d-block text-uppercase fs-11">Default Rate</small>
                          <span className="fw-bold fs-16">
                            ₹{Number(p.defaultRate || 0).toLocaleString("en-IN")}
                            <small className="text-muted fw-normal">/sqft</small>
                          </span>
                        </div>
                      </div>
                    </div>

                    {facilities.length > 0 && (
                      <div className="d-flex flex-wrap gap-1 mb-3">
                        {facilities.slice(0, 3).map((f) => (
                          <span key={f} className="badge bg-primary-subtle text-primary fw-normal">
                            {f}
                          </span>
                        ))}
                        {facilities.length > 3 && (
                          <span className="badge bg-light text-muted fw-normal">+{facilities.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {landmark && (
                      <p className="fs-12 text-muted mb-3 text-uppercase">
                        Near {landmark.name}{" "}
                        <span className="badge bg-light text-dark fw-normal ms-1">{landmark.distanceKm} km</span>
                      </p>
                    )}

                    <div className="mt-auto d-flex flex-column gap-2">
                      <Link to={`/agent/projects/${p._id}/map`} className="btn btn-sm btn-outline-warning fw-semibold">
                        <iconify-icon icon="solar:map-point-wave-bold-duotone" className="me-1"></iconify-icon>
                        Interactive Map
                      </Link>
                      <Link to={`/agent/projects/${p._id}`} className="btn btn-sm btn-light fw-semibold">
                        Details View
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default Projects;