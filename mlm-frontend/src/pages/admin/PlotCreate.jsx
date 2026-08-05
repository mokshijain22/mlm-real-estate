import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios.js";

function PlotCreate() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [baseRemainingArea, setBaseRemainingArea] = useState(0);

  const [plotNumber, setPlotNumber] = useState("");
  const [totalArea, setTotalArea] = useState("");
   const [pricePerSqft, setPricePerSqft] = useState("0");
  const [plcPercent, setPlcPercent] = useState("0");
  const [status, setStatus] = useState("");

  useEffect(() => {
    api
      .get(`/admin/projects/${projectId}/plots/create`)
      .then((res) => {
        setProject(res.data.project);
        setStatuses(res.data.statuses);
        setBaseRemainingArea(res.data.remainingArea);
        setStatus(res.data.statuses[0] || "");
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const enteredArea = parseFloat(totalArea) || 0;
  const remainingAfter = baseRemainingArea - enteredArea;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setErrors({});

    api
      .post(`/admin/projects/${projectId}/plots`, {
        plot_number: plotNumber,
        total_area: totalArea,
         price_per_sqft: pricePerSqft,
        plc_percent: plcPercent,
        status,
      })
      .then(() => {
        navigate(`/admin/projects/${projectId}/plots`);
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
      <div className="col-xl-6 col-lg-8 mx-auto">
        <div className="card">
          <div className="card-header">
            <h4 className="header-title">Add Plot to Project: {project?.name}</h4>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="plot_number" className="form-label">
                      Plot Number
                    </label>
                    <input
                      type="text"
                      id="plot_number"
                      className={`form-control ${errors.plot_number ? "is-invalid" : ""}`}
                      placeholder="e.g. P-001"
                      value={plotNumber}
                      onChange={(e) => setPlotNumber(e.target.value)}
                      required
                    />
                    {errors.plot_number && <div className="invalid-feedback">{errors.plot_number}</div>}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
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
                    <div className="form-text mt-1">
                      Remaining Project Area:{" "}
                      <span className={`fw-bold ${remainingAfter < 0 ? "text-danger" : "text-primary"}`}>
                        {remainingAfter.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>{" "}
                      sqft
                    </div>
                    {errors.total_area && <div className="invalid-feedback">{errors.total_area}</div>}
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="price_per_sqft" className="form-label">
                      Price / sqft
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="price_per_sqft"
                      className={`form-control ${errors.price_per_sqft ? "is-invalid" : ""}`}
                      value={pricePerSqft}
                      onChange={(e) => setPricePerSqft(e.target.value)}
                      required
                    />
                    {errors.price_per_sqft && <div className="invalid-feedback">{errors.price_per_sqft}</div>}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="plc_percent" className="form-label">
                      PLC (%) <span className="text-muted fs-12">(if any)</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        id="plc_percent"
                        className={`form-control ${errors.plc_percent ? "is-invalid" : ""}`}
                        value={plcPercent}
                        onChange={(e) => setPlcPercent(e.target.value)}
                      />
                      <span className="input-group-text">%</span>
                    </div>
                    {errors.plc_percent && <div className="invalid-feedback d-block">{errors.plc_percent}</div>}
                  </div>
                </div>
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
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
                {errors.status && <div className="invalid-feedback">{errors.status}</div>}
              </div>

              <div className="text-end">
                <Link to={`/admin/projects/${projectId}/plots`} className="btn btn-light me-1">
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Adding..." : "Add Plot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlotCreate;