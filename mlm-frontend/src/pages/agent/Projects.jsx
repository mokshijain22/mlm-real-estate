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
                  <h5 className="fw-bold mb-1">{p.name}</h5>
                  {p.location && (
                    <p className="text-muted fs-13 mb-2">
                      <iconify-icon icon="solar:map-point-bold-duotone" className="me-1"></iconify-icon>
                      {p.location}
                    </p>
                  )}
                  {p.description && <p className="fs-13 mb-3 flex-grow-1">{p.description}</p>}
                  <div className="d-flex justify-content-between align-items-center mt-auto">
                    <span className="badge bg-info-subtle text-info">
                      {p.totalArea?.toLocaleString("en-IN")} sqft
                    </span>
                    <Link to={`/agent/projects/${p._id}`} className="btn btn-sm btn-outline-primary">
                      View Plots
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