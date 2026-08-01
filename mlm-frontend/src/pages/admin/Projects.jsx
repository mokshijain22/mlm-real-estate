import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";

function statusBadge(status) {
  if (status === "active") return "bg-success-subtle text-success";
  if (status === "completed") return "bg-info-subtle text-info";
  return "bg-danger-subtle text-danger";
}

function statusLabel(status) {
  if (status === "active") return "Active";
  if (status === "completed") return "Completed";
  return "Inactive";
}

function Projects() {
  const [projects, setProjects] = useState(null);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const navigate = useNavigate();

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
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4 className="header-title">Project Management</h4>
            <Link to="/admin/projects/create" className="btn btn-primary btn-sm">
              Add Project
            </Link>
          </div>
          <div className="card-body">
            <div className="mb-3" style={{ maxWidth: "320px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name or location..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="table-responsive">
              <table className="table table-centered table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Total Area (sqft)</th>
                    <th>Plots Count</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center">
                        {search ? `No projects found for "${search}".` : "No projects found."}
                      </td>
                    </tr>
                  )}
                  {projects.map((project) => (
                    <tr key={project._id}>
                      <td>
                        <h5 className="font-14 my-1">
                          <Link to={`/admin/projects/${project._id}`} className="text-body">
                            {project.name}
                          </Link>
                        </h5>
                      </td>
                      <td>{project.location || "N/A"}</td>
                      <td>
                        {Number(project.totalArea).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td>{project.plotsCount}</td>
                      <td>
                        <span className={`badge ${statusBadge(project.status)}`}>{statusLabel(project.status)}</span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link to={`/admin/projects/${project._id}`} className="btn btn-light btn-sm" title="View">
                            <iconify-icon icon="solar:eye-broken" className="align-middle fs-18"></iconify-icon>
                          </Link>
                          <Link
                            to={`/admin/projects/${project._id}/edit`}
                            className="btn btn-soft-primary btn-sm"
                            title="Edit"
                          >
                            <iconify-icon icon="solar:pen-2-broken" className="align-middle fs-18"></iconify-icon>
                          </Link>
                          <Link
                            to={`/admin/projects/${project._id}/plots`}
                            className="btn btn-soft-info btn-sm"
                            title="Manage Plots"
                          >
                            <iconify-icon icon="solar:layers-minimalistic-broken" className="align-middle fs-18"></iconify-icon>
                          </Link>
                          <Link
                            to={`/admin/projects/${project._id}/map`}
                            className="btn btn-soft-success btn-sm"
                            title="View Plot Map"
                          >
                            <iconify-icon icon="solar:map-arrow-right-bold-duotone" className="align-middle fs-18"></iconify-icon>
                          </Link>
                          <button
                            type="button"
                            className="btn btn-soft-danger btn-sm"
                            title="Delete"
                            onClick={() => handleDelete(project._id)}
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
                <button
                  className="btn btn-light btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
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

export default Projects;