import { useEffect, useState } from "react";
import api from "../../api/axios.js";

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function SiteVisits() {
  const [visits, setVisits] = useState(null);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [altMobile, setAltMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [projectId, setProjectId] = useState("");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [photo, setPhoto] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function loadVisits() {
    api
      .get("/agent/site-visits")
      .then((res) => setVisits(res.data.data || []))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }

  useEffect(() => {
    loadVisits();
    api
      .get("/agent/projects")
      .then((res) => setProjects(res.data.data || res.data.projects || res.data || []))
      .catch(() => {});
  }, []);

  function resetForm() {
    setCustomerName("");
    setMobile("");
    setAltMobile("");
    setEmail("");
    setAddress("");
    setProjectId("");
    setVisitDate(new Date().toISOString().slice(0, 10));
    setPhoto(null);
    setFieldErrors({});
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setError(null);

    const payload = new FormData();
    payload.append("customer_name", customerName);
    payload.append("mobile", mobile);
    if (altMobile) payload.append("alt_mobile", altMobile);
    if (email) payload.append("email", email);
    if (address) payload.append("address", address);
    payload.append("project_id", projectId);
    if (visitDate) payload.append("visit_date", visitDate);
    if (photo) payload.append("photo", photo);

    api
      .post("/agent/site-visits", payload, { headers: { "Content-Type": "multipart/form-data" } })
      .then(() => {
        setShowForm(false);
        resetForm();
        loadVisits();
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setFieldErrors(err.response.data.errors);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <div>
          <h4 className="card-title mb-0">Site Visits</h4>
          <p className="text-muted small mb-0">Log a customer site visit</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Log Visit"}
        </button>
      </div>

      {error && (
        <div className="card-body pb-0">
          <div className="alert alert-danger mb-0">{error}</div>
        </div>
      )}

      {showForm && (
        <div className="card-body border-bottom">
          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-2">
              <div className="col-md-6">
                <label className="form-label">
                  Customer name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${fieldErrors.customer_name ? "is-invalid" : ""}`}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                {fieldErrors.customer_name && <div className="invalid-feedback">{fieldErrors.customer_name}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label">
                  Mobile <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${fieldErrors.mobile ? "is-invalid" : ""}`}
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
                {fieldErrors.mobile && <div className="invalid-feedback">{fieldErrors.mobile}</div>}
              </div>
            </div>

            <div className="row g-3 mb-2">
              <div className="col-md-6">
                <label className="form-label">Alt mobile</label>
                <input type="text" className="form-control" value={altMobile} onChange={(e) => setAltMobile(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="row g-3 mb-2">
              <div className="col-md-12">
                <label className="form-label">Address</label>
                <textarea className="form-control" rows={2} value={address} onChange={(e) => setAddress(e.target.value)}></textarea>
              </div>
            </div>

            <div className="row g-3 mb-2">
              <div className="col-md-4">
                <label className="form-label">
                  Project <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${fieldErrors.project_id ? "is-invalid" : ""}`}
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.project_id && <div className="invalid-feedback">{fieldErrors.project_id}</div>}
              </div>
              <div className="col-md-4">
                <label className="form-label">Visit date</label>
                <input type="date" className="form-control" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Photo</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="form-control"
                  onChange={(e) => setPhoto(e.target.files[0] || null)}
                />
              </div>
            </div>

            <div className="d-flex justify-content-end mt-3">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Saving…" : "Save visit"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card-body">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr className="text-muted small text-uppercase">
                <th>Photo</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Project</th>
                <th>Visit date</th>
              </tr>
            </thead>
            <tbody>
              {!visits ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">
                    Loading…
                  </td>
                </tr>
              ) : visits.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">
                    No site visits logged yet.
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr key={v._id}>
                    <td>
                      {v.photo ? (
                        <img
                          src={v.photo}
                          alt={v.customerName}
                          className="rounded"
                          style={{ width: 36, height: 36, objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          className="rounded bg-secondary-subtle d-flex align-items-center justify-content-center fw-bold text-secondary"
                          style={{ width: 36, height: 36 }}
                        >
                          {v.customerName?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </td>
                    <td className="fw-semibold">{v.customerName}</td>
                    <td>{v.mobile}</td>
                    <td>{v.project?.name || "-"}</td>
                    <td>{fmtDate(v.visitDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SiteVisits;