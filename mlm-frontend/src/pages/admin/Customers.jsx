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
  status: "active",
};

function Customers() {
  const [customers, setCustomers] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    const params = { page };
    if (status) params.status = status;
    api
      .get("/admin/customers", { params })
      .then((res) => {
        setCustomers(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setShowForm(true);
  };

  const openEditForm = (c) => {
    setEditingId(c._id);
    setForm({
      name: c.name || "",
      email: c.email || "",
      phone: c.phone || "",
      alternate_phone: c.alternatePhone || "",
      address: c.address || "",
      city: c.city || "",
      state: c.state || "",
      pincode: c.pincode || "",
      aadhaar_number: c.aadhaarNumber || "",
      pan_number: c.panNumber || "",
      status: c.status || "active",
    });
    setFieldErrors({});
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});

    const req = editingId
      ? api.put(`/admin/customers/${editingId}`, form)
      : api.post("/admin/customers", form);

    req
      .then(() => {
        setForm(emptyForm);
        setShowForm(false);
        setEditingId(null);
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

  const handleDelete = (id) => {
    if (!window.confirm("Delete this customer?")) return;
    api
      .delete(`/admin/customers/${id}`)
      .then(() => load())
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <div className="row align-items-center mb-4">
        <div className="col-sm-8">
          <h3 className="fw-bold mb-1">Customer Management</h3>
          <p className="text-muted mb-0">View and manage all customers across agents.</p>
        </div>
        <div className="col-sm-4 text-sm-end mt-3 mt-sm-0">
          <button className="btn btn-primary" onClick={openAddForm}>
            <iconify-icon icon="solar:user-plus-bold-duotone" className="align-middle me-1"></iconify-icon>
            Add Customer
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white border-bottom py-3">
            <h4 className="card-title mb-0">{editingId ? "Edit Customer" : "Add New Customer"}</h4>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    name="name"
                    className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
                    value={form.name}
                    onChange={handleChange}
                  />
                  {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`}
                    value={form.phone}
                    onChange={handleChange}
                  />
                  {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                    value={form.email}
                    onChange={handleChange}
                  />
                  {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Alternate Phone</label>
                  <input
                    type="text"
                    name="alternate_phone"
                    className="form-control"
                    value={form.alternate_phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">City</label>
                  <input type="text" name="city" className="form-control" value={form.city} onChange={handleChange} />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">State</label>
                  <input type="text" name="state" className="form-control" value={form.state} onChange={handleChange} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Address</label>
                  <input type="text" name="address" className="form-control" value={form.address} onChange={handleChange} />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    className={`form-control ${fieldErrors.pincode ? "is-invalid" : ""}`}
                    value={form.pincode}
                    onChange={handleChange}
                  />
                  {fieldErrors.pincode && <div className="invalid-feedback">{fieldErrors.pincode}</div>}
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Status</label>
                  <select name="status" className="form-select" value={form.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Aadhaar Number</label>
                  <input
                    type="text"
                    name="aadhaar_number"
                    className={`form-control ${fieldErrors.aadhaar_number ? "is-invalid" : ""}`}
                    value={form.aadhaar_number}
                    onChange={handleChange}
                  />
                  {fieldErrors.aadhaar_number && <div className="invalid-feedback">{fieldErrors.aadhaar_number}</div>}
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">PAN Number</label>
                  <input
                    type="text"
                    name="pan_number"
                    className={`form-control ${fieldErrors.pan_number ? "is-invalid" : ""}`}
                    value={form.pan_number}
                    onChange={handleChange}
                    placeholder="ABCDE1234F"
                  />
                  {fieldErrors.pan_number && <div className="invalid-feedback">{fieldErrors.pan_number}</div>}
                </div>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : editingId ? "Update Customer" : "Create Customer"}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-3">
              <select
                className="form-select"
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover table-nowrap align-middle mb-0">
            <thead className="bg-light bg-opacity-50">
              <tr>
                <th className="ps-3 text-muted small">Code</th>
                <th className="text-muted small">Name</th>
                <th className="text-muted small">Phone</th>
                <th className="text-muted small">Email</th>
                <th className="text-muted small">Added By</th>
                <th className="text-muted small">Status</th>
                <th className="text-muted small text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!customers ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    Loading...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id}>
                    <td className="ps-3 fw-medium">{c.customerCode}</td>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.email || "-"}</td>
                    <td>{c.addedBy?.name || "-"}</td>
                    <td>
                      <span className={`badge ${c.status === "active" ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-end pe-3">
                      <div className="d-flex gap-1 justify-content-end">
                        <button className="btn btn-sm btn-soft-primary" onClick={() => openEditForm(c)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-soft-danger" onClick={() => handleDelete(c._id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Page {meta.page} of {meta.lastPage || 1} ({meta.total} total)
            </span>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= meta.lastPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Customers;