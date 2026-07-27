import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios.js";

function statusBadge(status, type) {
  if (type === "project") {
    if (status === "active") return "bg-success-subtle text-success";
    if (status === "completed") return "bg-info-subtle text-info";
    return "bg-danger-subtle text-danger";
  }
  if (status === "available") return "bg-success-subtle text-success";
  if (status === "booked") return "bg-warning-subtle text-warning";
  return "bg-danger-subtle text-danger";
}

function statusLabel(status, type) {
  if (type === "project") {
    if (status === "active") return "Active";
    if (status === "completed") return "Completed";
    return "Inactive";
  }
  if (status === "available") return "Available";
  if (status === "booked") return "Booked";
  return "Sold";
}

function ProjectShow() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState(null);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  const load = () => {
    api
      .get(`/admin/projects/${id}`, { params: { page } })
      .then((res) => {
        setProject(res.data.project);
        setPlots(res.data.plots.data);
        setMeta(res.data.plots.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, page]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!project) return <div className="text-center py-5">Loading...</div>;

  return (
    <div className="row">
      <div className="col-xl-4 col-lg-5">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4 className="header-title">Project Details</h4>
            <div className="d-flex gap-2">
              <Link to={`/admin/projects/${project._id}/map`} className="btn btn-soft-success btn-sm">
                <iconify-icon icon="solar:map-arrow-right-bold-duotone" className="align-middle me-1 fs-16"></iconify-icon>
                View Map
              </Link>
              <Link to={`/admin/projects/${project._id}/edit`} className="btn btn-soft-primary btn-sm">
                Edit
              </Link>
            </div>
          </div>
          <div className="card-body">
            <h3 className="mb-3">{project.name}</h3>
            <div className="row mb-2">
              <div className="col-6 text-muted">Location:</div>
              <div className="col-6 fw-bold">{project.location || "N/A"}</div>
            </div>
            <div className="row mb-2">
              <div className="col-6 text-muted">Total Area:</div>
              <div className="col-6 fw-bold">
                {Number(project.totalArea).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                sqft
              </div>
            </div>
            <div className="row mb-2">
              <div className="col-6 text-muted">Status:</div>
              <div className="col-6">
                <span className={`badge ${statusBadge(project.status, "project")}`}>
                  {statusLabel(project.status, "project")}
                </span>
              </div>
            </div>
            <div className="row mb-2">
              <div className="col-6 text-muted">Created At:</div>
              <div className="col-6 fw-bold">
                {new Date(project.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
            {project.description && (
              <div className="mt-3">
                <h5 className="text-muted mb-2">Description:</h5>
                <p className="text-muted">{project.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-xl-8 col-lg-7">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4 className="header-title">Plots Overview</h4>
            <Link to={`/admin/projects/${project._id}/plots/create`} className="btn btn-primary btn-sm">
              Add Plot
            </Link>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-centered table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Plot Number</th>
                    <th>Area (sqft)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plots.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center">
                        No plots found for this project.
                      </td>
                    </tr>
                  )}
                  {plots.map((plot) => (
                    <tr key={plot._id}>
                      <td>
                        <Link to={`/admin/projects/${project._id}/plots/${plot._id}`} className="fw-bold">
                          {plot.plotNumber}
                        </Link>
                      </td>
                      <td>
                        {Number(plot.totalArea).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(plot.status, "plot")}`}>
                          {statusLabel(plot.status, "plot")}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link
                            to={`/admin/projects/${project._id}/plots/${plot._id}`}
                            className="btn btn-light btn-sm"
                          >
                            <iconify-icon icon="solar:eye-broken" className="align-middle fs-18"></iconify-icon>
                          </Link>
                          <Link
                            to={`/admin/projects/${project._id}/plots/${plot._id}/edit`}
                            className="btn btn-soft-primary btn-sm"
                          >
                            <iconify-icon icon="solar:pen-2-broken" className="align-middle fs-18"></iconify-icon>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && (
              <div className="mt-3 d-flex justify-content-center gap-2">
                <button className="btn btn-light btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <span className="align-self-center">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectShow;