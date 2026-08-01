import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

const categoryLabel = {
  commission: "Commission",
  kyc: "KYC",
  booking: "Booking",
  general: "General",
};

function Tickets() {
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", category: "general" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const load = () => {
    api
      .get("/agent/tickets")
      .then((res) => setTickets(res.data.tickets))
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});

    api
      .post("/agent/tickets", form)
      .then(() => {
        setForm({ subject: "", message: "", category: "general" });
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
  if (!tickets) return <div className="text-center py-5">Loading...</div>;

  const filteredTickets = tickets.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (t.ticketNumber || "").toLowerCase().includes(q) ||
      (t.subject || "").toLowerCase().includes(q) ||
      (categoryLabel[t.category] || t.category || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Support Tickets</h4>
          <p className="text-muted mb-0 fs-13">Raise and track your support requests.</p>
        </div>
        <button className="btn btn-primary fw-bold" onClick={() => setShowForm((v) => !v)}>
          <iconify-icon icon="solar:add-circle-bold-duotone" className="me-1"></iconify-icon>
          {showForm ? "Close Form" : "New Ticket"}
        </button>
      </div>

      {showForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <form onSubmit={handleSubmit} noValidate>
              <div className="row">
                <div className="col-md-8 mb-3">
                  <label className="form-label fw-semibold">Subject</label>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors.subject ? "is-invalid" : ""}`}
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                  {fieldErrors.subject && <div className="invalid-feedback">{fieldErrors.subject}</div>}
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">Category</label>
                  <select
                    className={`form-select ${fieldErrors.category ? "is-invalid" : ""}`}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="general">General</option>
                    <option value="commission">Commission</option>
                    <option value="kyc">KYC</option>
                    <option value="booking">Booking</option>
                  </select>
                  {fieldErrors.category && <div className="invalid-feedback">{fieldErrors.category}</div>}
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label fw-semibold">Message</label>
                  <textarea
                    rows="4"
                    className={`form-control ${fieldErrors.message ? "is-invalid" : ""}`}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  ></textarea>
                  {fieldErrors.message && <div className="invalid-feedback">{fieldErrors.message}</div>}
                </div>
              </div>
              <button type="submit" className="btn btn-primary fw-bold" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 pb-0">
          <div className="input-group" style={{ maxWidth: 320 }}>
            <span className="input-group-text bg-light border-end-0">
              <iconify-icon icon="solar:magnifer-linear"></iconify-icon>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search by ticket no, subject, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="card-body p-0">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-5 text-muted">
              {tickets.length === 0 ? "No tickets raised yet." : "No tickets match your search."}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Ticket No.</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => (
                    <tr key={t._id}>
                      <td className="fw-semibold">{t.ticketNumber}</td>
                      <td>{t.subject}</td>
                      <td>{categoryLabel[t.category]}</td>
                      <td>
                        <span className={`badge bg-${t.status === "open" ? "success" : "secondary"}-subtle text-${t.status === "open" ? "success" : "secondary"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>{new Date(t.createdAt).toLocaleDateString("en-IN")}</td>
                      <td>
                        <Link to={`/agent/tickets/${t._id}`} className="btn btn-sm btn-outline-primary">
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

export default Tickets;