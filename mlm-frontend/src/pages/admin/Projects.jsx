import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function statusBadge(status) {
  if (status === "active") return "bg-success-subtle text-success";
  if (status === "completed") return "bg-info-subtle text-info";
  return "bg-danger-subtle text-danger";
}

function statusLabel(status) {
  if (status === "active") return "Ongoing";
  if (status === "completed") return "Completed";
  return "Inactive";
}

function isTower(projectType) {
  return projectType === "Apartment";
}

function Projects() {
  const [projects, setProjects] = useState(null);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = () => {
    const params = { page };
    if (search.trim()) params.search = search.trim();
    api
      .get("/admin/projects", { params })
      .then((res) => {
        setProjects(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    api
      .delete(`/admin/projects/${id}`)
      .then(() => load())
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!projects) return <div className="text-center py-5">Loading...</div>;

  return (
    <div className="row">
      <div className="col-12">
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h3 className="fw-bold mb-1">Projects</h3>
              <p className="text-muted mb-0 fs-13">
                Set default ₹/sq ft, manage inventory units, and payment schedules per project.
              </p>
            </div>
            <Link to="/admin/projects/create" className="btn btn-warning fw-semibold">
              <iconify-icon icon="solar:add-circle-bold" className="me-1 align-middle"></iconify-icon>
              Add project
            </Link>
          </div>
        </div>

        <div className="mb-3" style={{ maxWidth: "320px" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or location..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {projects.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5 text-muted">
              {search ? `No projects found for "${search}".` : "No projects found."}
            </div>
          </div>
        ) : (
          <div className="row">
            {projects.map((project) => {
              const tower = isTower(project.projectType);
              const unitLabel = tower ? "Total Flats" : "Total Plots";
              const actionLabel = tower ? "View flats" : "View plots";
              const facilities = project.facilities || [];
              const landmark = (project.nearbyLandmarks || [])[0];

              return (
                <div className="col-md-6 col-xl-4 mb-4" key={project._id}>
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-4 d-flex flex-column">
                      <div className="d-flex align-items-start justify-content-between mb-1">
                        <h5 className="fw-bold mb-0">
                          <Link to={`/admin/projects/${project._id}`} className="text-body text-decoration-none">
                            {project.name}
                          </Link>
                        </h5>
                        <div className="d-flex gap-1 flex-shrink-0">
                          <span className={`badge ${statusBadge(project.status)}`}>
                            {statusLabel(project.status)}
                          </span>
                          {tower && (
                            <span className="badge bg-secondary-subtle text-secondary">Tower</span>
                          )}
                        </div>
                      </div>
                      <p className="fs-13 text-muted mb-3">{project.location || "—"}</p>

                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <div className="bg-light rounded p-2">
                            <small className="text-muted d-block text-uppercase fs-11">{unitLabel}</small>
                            <span className="fw-bold fs-16">{project.totalPlots ?? project.plotsCount ?? 0}</span>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="bg-light rounded p-2">
                            <small className="text-muted d-block text-uppercase fs-11">Default Rate</small>
                            <span className="fw-bold fs-16">
                              ₹{Number(project.defaultRate || 0).toLocaleString("en-IN")}
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
                            <span className="badge bg-light text-muted fw-normal">
                              +{facilities.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {landmark && (
                        <p className="fs-12 text-muted mb-3 text-uppercase">
                          Near {landmark.name}{" "}
                          <span className="badge bg-light text-dark fw-normal ms-1">
                            {landmark.distanceKm} km
                          </span>
                        </p>
                      )}

                      <div className="mt-auto d-flex gap-2">
                        <Link
                          to={`/admin/projects/${project._id}/plots`}
                          className="btn btn-sm btn-outline-dark fw-semibold flex-fill"
                        >
                          {actionLabel}
                        </Link>
                        <Link
                          to={`/admin/projects/${project._id}/edit`}
                          className="btn btn-sm btn-light fw-semibold flex-fill"
                        >
                          Edit
                        </Link>
                      </div>
                      <div className="d-flex gap-2 mt-2">
                        <Link
                          to={`/admin/projects/${project._id}/map`}
                          className="btn btn-sm btn-soft-success flex-fill"
                          title="View Plot Map"
                        >
                          <iconify-icon icon="solar:map-arrow-right-bold-duotone" className="align-middle"></iconify-icon>
                        </Link>
                        <button
                          type="button"
                          className="btn btn-sm btn-soft-danger flex-fill"
                          title="Delete"
                          onClick={() => handleDelete(project._id)}
                        >
                          <iconify-icon icon="solar:trash-bin-trash-broken" className="align-middle"></iconify-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {meta && (
          <div className="d-flex align-items-center justify-content-between mt-2 mb-4">
            <p className="text-muted fs-13 mb-0">
              Showing {projects.length} of {meta.total} projects
            </p>
            <div className="d-flex gap-2">
              <button
                className="btn btn-light btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="align-self-center fs-13">
                Page {meta.page} of {meta.lastPage || 1}
              </span>
              <button
                className="btn btn-light btn-sm"
                disabled={page >= meta.lastPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Projects;