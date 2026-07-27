import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
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

function PlotShow() {
  const { projectId, plotId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [plot, setPlot] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/admin/projects/${projectId}/plots/${plotId}`)
      .then((res) => {
        setProject(res.data.project);
        setPlot(res.data.plot);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [projectId, plotId]);

  const handleDelete = () => {
    if (!window.confirm("Are you sure you want to delete this plot?")) return;
    api
      .delete(`/admin/projects/${projectId}/plots/${plotId}`)
      .then(() => navigate(`/admin/projects/${projectId}/plots`))
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!project || !plot) return <div className="text-center py-5">Loading...</div>;

  return (
    <div className="row">
      <div className="col-xl-6 col-lg-8">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4 className="header-title">Plot Details</h4>
            <div className="d-flex gap-2">
              <Link to={`/admin/projects/${projectId}/plots/${plotId}/edit`} className="btn btn-soft-primary btn-sm">
                Edit
              </Link>
              <Link to={`/admin/projects/${projectId}/plots`} className="btn btn-light btn-sm">
                Back to List
              </Link>
            </div>
          </div>
          <div className="card-body">
            <div className="d-flex align-items-center mb-4">
              <div className="avatar-md bg-primary-subtle rounded-circle d-flex align-items-center justify-content-center me-3">
                <iconify-icon icon="solar:map-point-bold-duotone" className="fs-32 text-primary"></iconify-icon>
              </div>
              <div>
                <h3 className="mb-0">{plot.plotNumber}</h3>
                <span className="text-muted">
                  <Link to={`/admin/projects/${projectId}`}>{project.name}</Link>
                </span>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-sm-6">
                <div className="p-2 border rounded">
                  <p className="text-muted mb-1 fs-13">Total Area</p>
                  <h5 className="mb-0">
                    {Number(plot.totalArea).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    sqft
                  </h5>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="p-2 border rounded">
                  <p className="text-muted mb-1 fs-13">Status</p>
                  <span className={`badge ${statusBadge(plot.status)}`}>{statusLabel(plot.status)}</span>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="p-2 border rounded">
                  <p className="text-muted mb-1 fs-13">Price per sqft</p>
                  <h5 className="mb-0">
                    ₹
                    {Number(plot.pricePerSqft).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h5>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="p-2 border rounded">
                  <p className="text-muted mb-1 fs-13">Total Price</p>
                  <h5 className="mb-0 text-primary">
                    ₹
                    {(Number(plot.totalArea) * Number(plot.pricePerSqft)).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h5>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-top">
              <div className="row align-items-center">
                <div className="col">
                  <p className="text-muted mb-0 fs-12">
                    Created:{" "}
                    {new Date(plot.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="col-auto">
                  <button type="button" className="btn btn-link text-danger btn-sm p-0" onClick={handleDelete}>
                    Delete Plot
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlotShow;