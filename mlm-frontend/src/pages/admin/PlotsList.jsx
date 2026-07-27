import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios.js";

function statusBadge(status) {
  if (status === "available") return "bg-success-subtle text-success";
  if (status === "booked") return "bg-warning-subtle text-warning";
  return "bg-danger-subtle text-danger";
}

function statusLabel(status) {
  if (status === "available") return "Available";
  if (status === "booked") return "Booked";
  return "Sold";
}

function PlotsList() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState(null);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  const load = () => {
    api
      .get(`/admin/projects/${projectId}/plots`, { params: { page } })
      .then((res) => {
        setProject(res.data.project);
        setPlots(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, page]);

  const handleDelete = (plotId) => {
    if (!window.confirm("Are you sure you want to delete this plot?")) return;
    api
      .delete(`/admin/projects/${projectId}/plots/${plotId}`)
      .then(() => load())
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!project || !plots) return <div className="text-center py-5">Loading...</div>;

  return (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div>
              <h4 className="header-title">Plots for Project: {project.name}</h4>
              <p className="text-muted mb-0">
                Location: {project.location || "N/A"} | Total Area:{" "}
                {Number(project.totalArea).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                sqft
              </p>
            </div>
            <Link to={`/admin/projects/${projectId}/plots/create`} className="btn btn-primary btn-sm">
              Add Plot
            </Link>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-centered table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Plot Number</th>
                    <th>Total Area (sqft)</th>
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
                        <h5 className="font-14 my-1">
                          <Link to={`/admin/projects/${projectId}/plots/${plot._id}`} className="text-body font-bold">
                            {plot.plotNumber}
                          </Link>
                        </h5>
                      </td>
                      <td>
                        {Number(plot.totalArea).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(plot.status)}`}>{statusLabel(plot.status)}</span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link
                            to={`/admin/projects/${projectId}/plots/${plot._id}`}
                            className="btn btn-light btn-sm"
                            title="View"
                          >
                            <iconify-icon icon="solar:eye-broken" className="align-middle fs-18"></iconify-icon>
                          </Link>
                          <Link
                            to={`/admin/projects/${projectId}/plots/${plot._id}/edit`}
                            className="btn btn-soft-primary btn-sm"
                            title="Edit"
                          >
                            <iconify-icon icon="solar:pen-2-broken" className="align-middle fs-18"></iconify-icon>
                          </Link>
                          <button
                            type="button"
                            className="btn btn-soft-danger btn-sm"
                            title="Delete"
                            onClick={() => handleDelete(plot._id)}
                          >
                            <iconify-icon icon="solar:trash-bin-trash-broken" className="align-middle fs-18"></iconify-icon>
                          </button>
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

export default PlotsList;