import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios.js";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "site_visit_scheduled", label: "Site Visit Scheduled" },
  { value: "site_visit_done", label: "Site Visit Done" },
  { value: "negotiation", label: "Negotiation" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "call", label: "Call" },
  { value: "social_media", label: "Social Media" },
  { value: "other", label: "Other" },
];

const statusBadge = (status) => {
  const map = {
    new: "primary",
    contacted: "info",
    site_visit_scheduled: "warning",
    site_visit_done: "warning",
    negotiation: "secondary",
    converted: "success",
    lost: "danger",
  };
  return map[status] || "secondary";
};

function emptyForm() {
  return {
    name: "",
    mobile: "",
    email: "",
    project_id: "",
    plot_number: "",
    location: "",
    budget: "",
    source: "website",
    status: "new",
    assigned_agent_id: "",
    notes: "",
  };
}

function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState(null);
  const [meta, setMeta] = useState(null);
  const [projects, setProjects] = useState([]);
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/projects").then((res) => setProjects(res.data.data || res.data)).catch(() => {});
    api.get("/admin/agents").then((res) => setAgents(res.data.data || res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadLeads = () => {
    const params = { page };
    if (search.trim()) params.search = search.trim();
    if (status !== "all") params.status = status;
    api
      .get("/admin/leads", { params })
      .then((res) => {
        setLeads(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(loadLeads, [search, status, page]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (lead) => {
    setEditingId(lead._id);
    setForm({
      name: lead.name || "",
      mobile: lead.mobile || "",
      email: lead.email || "",
      project_id: lead.project?._id || "",
      plot_number: lead.plotNumber || "",
      location: lead.location || "",
      budget: lead.budget ?? "",
      source: lead.source || "other",
      status: lead.status || "new",
      assigned_agent_id: lead.assignedAgent?._id || "",
      notes: lead.notes || "",
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormErrors({});
    try {
      if (editingId) {
        await api.put(`/admin/leads/${editingId}`, form);
      } else {
        await api.post("/admin/leads", form);
      }
      setShowModal(false);
      loadLeads();
    } catch (err) {
      setFormErrors(err.response?.data?.errors || { general: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lead?")) return;
    try {
      await api.delete(`/admin/leads/${id}`);
      loadLeads();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleConvert = (lead) => {
    navigate(`/admin/bookings/create?lead_id=${lead._id}`);
  };

  const fmt = (n) => (n == null ? "-" : "₹" + Number(n).toLocaleString("en-IN"));
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h3 className="mt-2 mb-4">Lead Engine</h3>
          <button type="button" className="btn btn-primary" onClick={openAddModal}>
            <iconify-icon icon="solar:add-circle-bold-duotone" className="me-1"></iconify-icon>
            Add Lead
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name or plot number"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Lead Status</label>
              <select className="form-select" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
                <option value="all">All Leads</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Customer</th><th>Mobile</th><th>Plot No</th><th>Project</th><th>Location</th><th>Budget</th><th>Source</th><th>Status</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads && leads.length === 0 && (
                <tr><td colSpan="10" className="text-center text-muted py-4">No leads found.</td></tr>
              )}
              {leads?.map((l) => (
                <tr key={l._id}>
                  <td>{l.name}</td>
                  <td>{l.mobile}</td>
                  <td>{l.plotNumber || "-"}</td>
                  <td>{l.project?.name || "-"}</td>
                  <td>{l.location || "-"}</td>
                  <td>{fmt(l.budget)}</td>
                  <td><span className="badge bg-secondary-subtle text-secondary">{SOURCE_OPTIONS.find((s) => s.value === l.source)?.label || l.source}</span></td>
                  <td><span className={`badge bg-${statusBadge(l.status)}-subtle text-${statusBadge(l.status)}`}>{STATUS_OPTIONS.find((s) => s.value === l.status)?.label || l.status}</span></td>
                  <td>{fmtDate(l.createdAt)}</td>
                  <td className="text-nowrap">
                    <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => openEditModal(l)}>
                      <iconify-icon icon="solar:pen-bold-duotone"></iconify-icon>
                    </button>
                    {l.status !== "converted" && (
                      <button type="button" className="btn btn-sm btn-outline-success me-1" onClick={() => handleConvert(l)}>
                        Convert
                      </button>
                    )}
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(l._id)}>
                      <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && (
          <div className="card-footer d-flex justify-content-between align-items-center">
            <span className="text-muted">Page {meta.page} of {meta.lastPage || 1} ({meta.total} total)</span>
            <div>
              <button type="button" className="btn btn-sm btn-outline-secondary me-2" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page >= meta.lastPage} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingId ? "Edit Lead" : "Add Lead"}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                {formErrors.general && <div className="alert alert-danger">{formErrors.general}</div>}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Name *</label>
                    <input type="text" className={`form-control ${formErrors.name ? "is-invalid" : ""}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Mobile *</label>
                    <input type="text" className={`form-control ${formErrors.mobile ? "is-invalid" : ""}`} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                    {formErrors.mobile && <div className="invalid-feedback">{formErrors.mobile}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Location</label>
                    <input type="text" className="form-control" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Project</label>
                    <select className="form-select" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                      <option value="">Select project</option>
                      {projects.map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Plot No (optional)</label>
                    <input type="text" className="form-control" value={form.plot_number} onChange={(e) => setForm({ ...form, plot_number: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Budget</label>
                    <input type="number" className="form-control" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Source</label>
                    <select className="form-select" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                      {SOURCE_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Assign to Executive</label>
                    <select className="form-select" value={form.assigned_agent_id} onChange={(e) => setForm({ ...form, assigned_agent_id: e.target.value })}>
                      <option value="">Unassigned</option>
                      {agents.map((a) => (<option key={a._id} value={a._id}>{a.name}</option>))}
                    </select>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Add Lead"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Leads;