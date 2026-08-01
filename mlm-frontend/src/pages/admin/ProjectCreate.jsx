import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";

const STATUSES = ["active", "inactive", "completed"];
const PROJECT_TYPES = ["Plotted Development (Society)", "Apartment", "Villa", "Commercial", "Mixed Use"];
const FACILITY_OPTIONS = [
  "Clubhouse", "Jogging Track", "24x7 Security", "Swimming Pool", "Gym/Fitness Center",
  "Kids Play Area", "Landscaped Gardens", "Power Backup", "CCTV Surveillance",
  "Parking", "Community Hall", "Rainwater Harvesting",
];

function ProjectCreate() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [totalArea, setTotalArea] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [layoutSvg, setLayoutSvg] = useState(null);

  const [projectType, setProjectType] = useState("");
  const [totalPlots, setTotalPlots] = useState("");
  const [defaultRate, setDefaultRate] = useState("");
  const [defaultOwnerMinimum, setDefaultOwnerMinimum] = useState("");
  const commissionPool = (Number(defaultRate) || 0) - (Number(defaultOwnerMinimum) || 0);

  const [facilities, setFacilities] = useState([]);
  const [landmarkName, setLandmarkName] = useState("");
  const [landmarkDistance, setLandmarkDistance] = useState("");
  const [landmarks, setLandmarks] = useState([]);

  const toggleFacility = (f) => {
    setFacilities((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const addLandmark = () => {
    if (!landmarkName.trim() || !landmarkDistance) return;
    setLandmarks((prev) => [...prev, { name: landmarkName.trim(), distanceKm: Number(landmarkDistance) }]);
    setLandmarkName("");
    setLandmarkDistance("");
  };

  const removeLandmark = (idx) => {
    setLandmarks((prev) => prev.filter((_, i) => i !== idx));
  };

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
    formData.append("project_type", projectType);
    formData.append("total_plots", totalPlots);
    formData.append("default_rate", defaultRate);
    formData.append("default_owner_minimum", defaultOwnerMinimum);
    formData.append("facilities", JSON.stringify(facilities));
    formData.append("nearby_landmarks", JSON.stringify(landmarks));
    if (layoutSvg) formData.append("layout_svg", layoutSvg);

    api
      .post("/admin/projects", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => {
        navigate(`/admin/projects/${res.data.data._id}`);
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

  return (
    <div className="row">
      <div className="col-xl-8 col-lg-10 mx-auto">
        <div className="card">
          <div className="card-header">
            <h4 className="header-title">Create Project</h4>
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
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="project_type" className="form-label">
                    Project Type
                  </label>
                  <select
                    id="project_type"
                    className={`form-control ${errors.project_type ? "is-invalid" : ""}`}
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                  >
                    <option value="">Select project type</option>
                    {PROJECT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {errors.project_type && <div className="invalid-feedback">{errors.project_type}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="total_plots" className="form-label">
                    Total Plots
                  </label>
                  <input
                    type="number"
                    id="total_plots"
                    className="form-control"
                    value={totalPlots}
                    onChange={(e) => setTotalPlots(e.target.value)}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-12 mb-3">
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

              <div className="card bg-light border mb-3">
                <div className="card-body">
                  <h6 className="mb-3">Project Pricing &amp; Commission</h6>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="default_rate" className="form-label">
                        Default Rate (₹/sq ft)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="default_rate"
                        className="form-control"
                        placeholder="e.g. 2100"
                        value={defaultRate}
                        onChange={(e) => setDefaultRate(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="default_owner_minimum" className="form-label">
                        Default Owner Minimum (₹/sq ft)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="default_owner_minimum"
                        className="form-control"
                        value={defaultOwnerMinimum}
                        onChange={(e) => setDefaultOwnerMinimum(e.target.value)}
                      />
                      <div className="form-text text-muted">
                        Floor per-sqft price agents can't sell below the owner's minimum.
                      </div>
                    </div>
                  </div>
                  <div className="mb-0">
                    <label className="form-label">Commission Pool (₹/sq ft) — Auto Calculated</label>
                    <input type="text" className="form-control" value={commissionPool.toFixed(2)} disabled />
                    <div className="form-text text-muted">
                      Cumulative Rack Selling Price − Owner Minimum value.
                    </div>
                  </div>
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
                <label className="form-label">Facilities (Optional)</label>
                <div className="row">
                  {FACILITY_OPTIONS.map((f) => (
                    <div className="col-md-4 col-6" key={f}>
                      <div className="form-check mb-2">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`facility-${f}`}
                          checked={facilities.includes(f)}
                          onChange={() => toggleFacility(f)}
                        />
                        <label className="form-check-label" htmlFor={`facility-${f}`}>
                          {f}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Nearby Landmarks (Optional)</label>
                <div className="row g-2 mb-2">
                  <div className="col-md-7">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Landmark name (e.g. Airport, IT Park)"
                      value={landmarkName}
                      onChange={(e) => setLandmarkName(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      placeholder="Distance (km)"
                      value={landmarkDistance}
                      onChange={(e) => setLandmarkDistance(e.target.value)}
                    />
                  </div>
                  <div className="col-md-2">
                    <button type="button" className="btn btn-light w-100" onClick={addLandmark}>
                      Add
                    </button>
                  </div>
                </div>
                {landmarks.length > 0 && (
                  <ul className="list-group">
                    {landmarks.map((l, i) => (
                      <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                        {l.name} — {l.distanceKm} km
                        <button
                          type="button"
                          className="btn btn-sm btn-soft-danger"
                          onClick={() => removeLandmark(i)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="layout_svg" className="form-label">
                  Layout SVG (Optional)
                </label>
                <input
                  type="file"
                  id="layout_svg"
                  accept=".svg"
                  className={`form-control ${errors.layout_svg ? "is-invalid" : ""}`}
                  onChange={(e) => setLayoutSvg(e.target.files[0])}
                />
                <div className="form-text text-muted">A sample map will be generated if you don't upload one.</div>
                {errors.layout_svg && <div className="invalid-feedback">{errors.layout_svg}</div>}
              </div>

              <div className="text-end">
                <Link to="/admin/projects" className="btn btn-light me-1">
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectCreate;