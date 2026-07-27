import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios.js";

function PlotEdit() {
  const { projectId, plotId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [baseRemainingArea, setBaseRemainingArea] = useState(0);
  const [initialPlotArea, setInitialPlotArea] = useState(0);

  const [plotNumber, setPlotNumber] = useState("");
  const [totalArea, setTotalArea] = useState("");
  const [pricePerSqft, setPricePerSqft] = useState("");
  const [plcAmount, setPlcAmount] = useState("0");
  const [status, setStatus] = useState("");

  useEffect(() => {
    api
      .get(`/admin/projects/${projectId}/plots/${plotId}/edit`)
      .then((res) => {
        setProject(res.data.project);
        setStatuses(res.data.statuses);
        setBaseRemainingArea(res.data.remainingArea);
        setPlotNumber(res.data.plot.plotNumber);
        setTotalArea(res.data.plot.totalArea);
        setInitialPlotArea(res.data.plot.totalArea);
        setPricePerSqft(res.data.plot.pricePerSqft);
        setPlcAmount(res.data.plot.plcAmount || 0);
        setStatus(res.data.plot.status);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [projectId, plotId]);

  const enteredArea = parseFloat(totalArea) || 0;
  const remainingAfter = baseRemainingArea + initialPlotArea - enteredArea;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setErrors({});

    api
      .put(`/admin/projects/${projectId}/plots/${plotId}`, {
        plot_number: plotNumber,
        total_area: totalArea,
        price_per_sqft: pricePerSqft,
        plc_amount: plcAmount,
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
            <h4 className="header-title">Edit Plot: {plotNumber}</h4>
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
                      sqft <span className="text-muted fs-11 ms-1">(including current plot)</span>
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
                    <label htmlFor="plc_amount" className="form-label">
                      PLC Amount (₹) <span className="text-muted fs-12">(if any)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="plc_amount"
                      className={`form-control ${errors.plc_amount ? "is-invalid" : ""}`}
                      value={plcAmount}
                      onChange={(e) => setPlcAmount(e.target.value)}
                    />
                    {errors.plc_amount && <div className="invalid-feedback">{errors.plc_amount}</div>}
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
                  {saving ? "Updating..." : "Update Plot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlotEdit;