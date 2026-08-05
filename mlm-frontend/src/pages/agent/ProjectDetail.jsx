import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios.js";

const statusColor = { available: "success", booked: "warning", sold: "secondary" };

function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/agent/projects/${id}`, { params: { page } })
      .then((res) => {
        setProject(res.data.project);
        setPlots(res.data.plots || []);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [id, page]);

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!project) return <div className="text-center py-5">Loading...</div>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">{project.name}</h4>
          <p className="text-muted mb-0 fs-13">{project.location}</p>
        </div>
        <div className="d-flex gap-2">
          <Link to={`/agent/projects/${id}/map`} className="btn btn-outline-warning fw-bold">
            <iconify-icon icon="solar:map-point-wave-bold-duotone" className="me-1"></iconify-icon>
            View Map
          </Link>
          <Link to="/agent/projects" className="btn btn-outline-secondary fw-bold">
            Back to Projects
          </Link>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-3 col-6">
              <div className="bg-light rounded p-2">
                <small className="text-muted d-block text-uppercase fs-11">Total Area</small>
                <span className="fw-bold fs-15">
                  {Number(project.totalArea || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sqft
                </span>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="bg-light rounded p-2">
                <small className="text-muted d-block text-uppercase fs-11">Default Rate</small>
                <span className="fw-bold fs-15">₹{Number(project.defaultRate || 0).toLocaleString("en-IN")}/sqft</span>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="bg-light rounded p-2">
                <small className="text-muted d-block text-uppercase fs-11">Status</small>
                <span className="fw-bold fs-15 text-capitalize">{project.status}</span>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="bg-light rounded p-2">
                <small className="text-muted d-block text-uppercase fs-11">Added On</small>
                <span className="fw-bold fs-15">
                  {new Date(project.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>
          {project.description && <p className="text-muted mb-0 mt-3">{project.description}</p>}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="p-4 pb-0">
            <h6 className="fw-bold mb-0">Plots ({meta?.total ?? plots.length})</h6>
          </div>
          {plots.length === 0 ? (
            <div className="text-center py-5 text-muted">No plots added for this project yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 mt-3">
                <thead className="table-light">
                  <tr>
                    <th>Plot No.</th>
                    <th>Area</th>
                    <th>Price / Sqft</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {plots.map((pl) => (
                    <tr key={pl._id}>
                      <td className="fw-semibold">{pl.plotNumber}</td>
                      <td>{pl.totalArea} sqft</td>
                      <td>₹{pl.pricePerSqft?.toLocaleString("en-IN")}</td>
                      <td>
                        <span className={`badge bg-${statusColor[pl.status]}-subtle text-${statusColor[pl.status]}`}>
                          {pl.status}
                        </span>
                      </td>
                      <td>
                        {pl.status === "available" && (
                          <Link to={`/agent/bookings/new?plot_id=${pl._id}`} className="btn btn-sm btn-primary">
                            Book
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.lastPage > 1 && (
            <div className="p-3 d-flex justify-content-between align-items-center">
              <span className="text-muted small">
                Page {meta.page} of {meta.lastPage} ({meta.total} total)
              </span>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <button className="btn btn-sm btn-outline-secondary" disabled={page >= meta.lastPage} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ProjectDetail;