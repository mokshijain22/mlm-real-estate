import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  alternate_phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  aadhaar_number: "",
  pan_number: "",
};

function Customers() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    api
      .get("/agent/customers")
      .then((res) => setCustomers(res.data.customers))
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});

    api
      .post("/agent/customers", form)
      .then(() => {
        setForm(emptyForm);
        setShowForm(false);
        load();
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setFieldErrors(err.response.data.errors);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setSubmitting(false));
  };

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!customers) return <div className="text-center py-5">Loading...</div>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">My Customers</h4>
          <p className="text-muted mb-0 fs-13">Customers you've added.</p>
        </div>
        <button className="btn btn-primary fw-bold" onClick={() => setShowForm((v) => !v)}>
          <iconify-icon icon="solar:add-circle-bold-duotone" className="me-1"></iconify-icon>
          {showForm ? "Close Form" : "Add Customer"}
        </button>
      </div>

      {showForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <form onSubmit={handleSubmit} noValidate>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Name *</label>
                  <input
                    type="text"
                    name="name"
                    className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
                    value={form.name}
                    onChange={handleChange}
                  />
                  {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`}
                    value={form.phone}
                    onChange={handleChange}
                  />
                  {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input
                    type="email"
                    name="email"
                    className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                    value={form.email}
                    onChange={handleChange}
                  />
                  {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Alternate Phone</label>
                  <input
                    type="text"
                    name="alternate_phone"
                    className="form-control"
                    value={form.alternate_phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label fw-semibold">Address</label>
                  <input type="text" name="address" className="form-control" value={form.address} onChange={handleChange} />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">City</label>
                  <input type="text" name="city" className="form-control" value={form.city} onChange={handleChange} />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">State</label>
                  <input type="text" name="state" className="form-control" value={form.state} onChange={handleChange} />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    className={`form-control ${fieldErrors.pincode ? "is-invalid" : ""}`}
                    value={form.pincode}
                    onChange={handleChange}
                  />
                  {fieldErrors.pincode && <div className="invalid-feedback">{fieldErrors.pincode}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Aadhaar Number</label>
                  <input
                    type="text"
                    name="aadhaar_number"
                    className={`form-control ${fieldErrors.aadhaar_number ? "is-invalid" : ""}`}
                    value={form.aadhaar_number}
                    onChange={handleChange}
                  />
                  {fieldErrors.aadhaar_number && <div className="invalid-feedback">{fieldErrors.aadhaar_number}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">PAN Number</label>
                  <input
                    type="text"
                    name="pan_number"
                    className={`form-control text-uppercase ${fieldErrors.pan_number ? "is-invalid" : ""}`}
                    value={form.pan_number}
                    onChange={handleChange}
                  />
                  {fieldErrors.pan_number && <div className="invalid-feedback">{fieldErrors.pan_number}</div>}
                </div>
              </div>
              <button type="submit" className="btn btn-primary fw-bold" disabled={submitting}>
                {submitting ? "Saving..." : "Save Customer"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {customers.length === 0 ? (
            <div className="text-center py-5 text-muted">No customers added yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c._id}>
                      <td className="fw-semibold">{c.customerCode}</td>
                      <td>{c.name}</td>
                      <td>{c.phone}</td>
                      <td>{c.city || "—"}</td>
                      <td>
                        <span className={`badge bg-${c.status === "active" ? "success" : "secondary"}-subtle text-${c.status === "active" ? "success" : "secondary"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <Link to={`/agent/customers/${c._id}`} className="btn btn-sm btn-outline-primary">
                          View
                        </Link>
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

export default Customers;