import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function Projects() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/agent/projects")
      .then((res) => setProjects(res.data.projects))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!projects) return <div className="text-center py-5">Loading...</div>;

  return (
    <>
      <h4 className="fw-bold mb-1">Projects</h4>
      <p className="text-muted mb-4 fs-13">Browse available real estate projects.</p>

      {projects.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">No active projects available.</div>
        </div>
      ) : (
        <div className="row">
          {projects.map((p) => (
            <div className="col-md-6 col-xl-4 mb-4" key={p._id}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4 d-flex flex-column">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div
                      className="d-flex align-items-center justify-content-center rounded"
                      style={{ width: 40, height: 40, background: "#fee9db" }}
                    >
                      <iconify-icon icon="solar:buildings-3-bold-duotone" className="fs-20 text-warning"></iconify-icon>
                    </div>
                    <h5 className="fw-bold mb-0">{p.name}</h5>
                  </div>
                  {p.description && <p className="fs-13 text-muted mb-3">{p.description}</p>}
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <div className="bg-light rounded p-2">
                        <small className="text-muted d-block">Location</small>
                        <span className="fw-semibold fs-13">{p.location || "—"}</span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light rounded p-2">
                        <small className="text-muted d-block">Plots</small>
                        <span className="fw-semibold fs-13">{p.plotsCount ?? 0}</span>
                      </div>
                    </div>
                  </div>
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
          ))}
        </div>
      )}
    </>
  );
}

export default Projects;