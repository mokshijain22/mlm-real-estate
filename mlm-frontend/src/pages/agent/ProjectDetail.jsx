import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios.js";

const statusColor = { available: "success", booked: "warning", sold: "secondary" };

function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/agent/projects/${id}`)
      .then((res) => {
        setProject(res.data.project);
        setPlots(res.data.plots || []);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [id]);

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!project) return <div className="text-center py-5">Loading...</div>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">{project.name}</h4>
          <p className="text-muted mb-0 fs-13">{project.location}</p>
        </div>
        <Link to="/agent/projects" className="btn btn-outline-secondary fw-bold">
          Back to Projects
        </Link>
      </div>

      {project.description && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <p className="mb-0">{project.description}</p>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="p-4 pb-0">
            <h6 className="fw-bold mb-0">Plots ({plots.length})</h6>
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
        </div>
      </div>
    </>
  );
}

export default ProjectDetail;