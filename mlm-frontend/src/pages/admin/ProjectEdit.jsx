import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios.js";

const STATUSES = ["active", "inactive", "completed"];

function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [totalArea, setTotalArea] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [layoutSvg, setLayoutSvg] = useState(null);
  const [currentLayoutSvg, setCurrentLayoutSvg] = useState(null);

  useEffect(() => {
    api
      .get(`/admin/projects/${id}`)
      .then((res) => {
        const p = res.data.project;
        setName(p.name);
        setLocation(p.location || "");
        setTotalArea(p.totalArea);
        setDescription(p.description || "");
        setStatus(p.status);
        setCurrentLayoutSvg(p.layoutSvg);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setErrors({});

    const formData = new FormData();
    formData.append("name", name);
    formData.append("location", location);
    formData.append("total_area", totalArea);
    formData.append("description", description);
    formData.append("status", status);
    if (layoutSvg) formData.append("layout_svg", layoutSvg);

    api
      .put(`/admin/projects/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(() => {
        navigate(`/admin/projects/${id}`);
      })
      .catch((err) => {
        if (err.response?.status === 422) {
          setErrors(err.response.data.errors || {});
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="text-center py-5">Loading...</div>;

  return (
    <div className="row">
      <div className="col-xl-8 col-lg-10 mx-auto">
        <div className="card">
          <div className="card-header">
            <h4 className="header-title">Edit Project: {name}</h4>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-12 mb-3">
                  <label htmlFor="name" className="form-label">
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    className={`form-control ${errors.name ? "is-invalid" : ""}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="location" className="form-label">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    className={`form-control ${errors.location ? "is-invalid" : ""}`}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                  {errors.location && <div className="invalid-feedback">{errors.location}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="total_area" className="form-label">
                    Total Area (sqft)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="total_area"
                    className={`form-control ${errors.total_area ? "is-invalid" : ""}`}
                    value={totalArea}
                    onChange={(e) => setTotalArea(e.target.value)}
                    required
                  />
                  {errors.total_area && <div className="invalid-feedback">{errors.total_area}</div>}
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  id="description"
                  rows="4"
                  className={`form-control ${errors.description ? "is-invalid" : ""}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {errors.description && <div className="invalid-feedback">{errors.description}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="status" className="form-label">
                  Status
                </label>
                <select
                  id="status"
                  className={`form-control ${errors.status ? "is-invalid" : ""}`}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
                {errors.status && <div className="invalid-feedback">{errors.status}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="layout_svg" className="form-label">
                  Layout SVG (Optional)
                </label>
                {currentLayoutSvg && (
                  <div className="mb-2">
                    <span className="badge bg-info-subtle text-info">
                      Current SVG: {currentLayoutSvg.split("/").pop()}
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  id="layout_svg"
                  accept=".svg"
                  className={`form-control ${errors.layout_svg ? "is-invalid" : ""}`}
                  onChange={(e) => setLayoutSvg(e.target.files[0])}
                />
                {errors.layout_svg && <div className="invalid-feedback">{errors.layout_svg}</div>}
              </div>

              <div className="text-end">
                <Link to="/admin/projects" className="btn btn-light me-1">
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Updating..." : "Update Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectEdit;