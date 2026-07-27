import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";

const statusBadge = {
  pending: { color: "warning", icon: "solar:clock-circle-bold-duotone", label: "Pending Review" },
  approved: { color: "success", icon: "solar:check-circle-bold-duotone", label: "Approved" },
  rejected: { color: "danger", icon: "solar:close-circle-bold-duotone", label: "Rejected" },
};

function Kyc() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null); // "form" | "status"
  const [existingKyc, setExistingKyc] = useState(null);

  const [form, setForm] = useState({
    aadhaar_number: "",
    pan_number: "",
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_name: "",
  });
  const [files, setFiles] = useState({
    aadhaar_front: null,
    aadhaar_back: null,
    pan_document: null,
    bank_proof: null,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadKyc = () => {
    setLoading(true);
    setError(null);
    api
      .get("/agent/kyc")
      .then((res) => {
        const d = res.data;
        if (d.redirect === "dashboard") {
          navigate("/agent/dashboard");
          return;
        }
        if (d.redirect === "status") {
          return api.get("/agent/kyc/status").then((r2) => {
            setExistingKyc(r2.data.kyc);
            setMode("status");
          });
        }
        // form mode - prefill if a rejected/incomplete record exists
        if (d.kyc) {
          setExistingKyc(d.kyc);
          setForm({
            aadhaar_number: d.kyc.aadhaarNumber || "",
            pan_number: d.kyc.panNumber || "",
            bank_account_number: d.kyc.bankAccountNumber || "",
            bank_ifsc_code: d.kyc.bankIfscCode || "",
            bank_name: d.kyc.bankName || "",
          });
        }
        setMode("form");
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadKyc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFile = (e) => {
    setFiles({ ...files, [e.target.name]: e.target.files[0] || null });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setSuccessMsg(null);
    setError(null);

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    Object.entries(files).forEach(([key, file]) => {
      if (file) payload.append(key, file);
    });

    api
      .post("/agent/kyc", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => {
        setSuccessMsg(res.data.message || "KYC submitted successfully.");
        setTimeout(() => loadKyc(), 1200);
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

  if (loading) return <div className="text-center py-5">Loading...</div>;
  if (error)
    return (
      <div className="alert alert-danger border-0 shadow-sm" role="alert">
        {error}
      </div>
    );

  // ----- STATUS VIEW (submitted, awaiting review) -----
  if (mode === "status" && existingKyc) {
    const badge = statusBadge[existingKyc.status] || statusBadge.pending;
    return (
      <div className="row justify-content-center">
        <div className="col-xl-7">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <div
                className={`avatar-lg mx-auto mb-3 bg-${badge.color}-subtle rounded-circle d-flex align-items-center justify-content-center`}
                style={{ width: 80, height: 80 }}
              >
                <iconify-icon
                  icon={badge.icon}
                  className={`fs-36 text-${badge.color}`}
                ></iconify-icon>
              </div>
              <h4 className="fw-bold mb-2">KYC {badge.label}</h4>
              <p className="text-muted mb-3">
                Your KYC documents have been submitted and are currently under review by our team.
                You'll be notified once it's processed.
              </p>
              <span className={`badge bg-${badge.color}-subtle text-${badge.color} fs-13 px-3 py-2`}>
                Status: {badge.label}
              </span>

              <div className="row mt-4 text-start">
                <div className="col-md-6 mb-2">
                  <small className="text-muted d-block">Aadhaar Number</small>
                  <span className="fw-semibold">{existingKyc.aadhaarNumber}</span>
                </div>
                <div className="col-md-6 mb-2">
                  <small className="text-muted d-block">PAN Number</small>
                  <span className="fw-semibold">{existingKyc.panNumber}</span>
                </div>
                <div className="col-md-6 mb-2">
                  <small className="text-muted d-block">Bank Name</small>
                  <span className="fw-semibold">{existingKyc.bankName}</span>
                </div>
                <div className="col-md-6 mb-2">
                  <small className="text-muted d-block">Account Number</small>
                  <span className="fw-semibold">{existingKyc.bankAccountNumber}</span>
                </div>
              </div>

              <Link to="/agent/dashboard" className="btn btn-outline-primary fw-bold mt-3">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----- FORM VIEW (new submission or rejected -> resubmit) -----
  const isRejected = existingKyc?.status === "rejected";

  return (
    <div className="row justify-content-center">
      <div className="col-xl-8">
        {isRejected && (
          <div className="alert alert-danger border-0 shadow-sm mb-4" role="alert">
            <div className="d-flex align-items-center">
              <iconify-icon icon="solar:close-circle-bold-duotone" className="fs-24 me-2"></iconify-icon>
              <div>
                <strong>Previous submission rejected.</strong>{" "}
                Reason: {existingKyc.rejectionReason || "Not specified"}. Please correct and resubmit below.
              </div>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success border-0 shadow-sm mb-4" role="alert">
            {successMsg}
          </div>
        )}

        <div className="card border-0 shadow-sm">
          <div className="card-header bg-transparent border-0 pt-4 px-4">
            <h4 className="fw-bold mb-1">KYC Verification</h4>
            <p className="text-muted mb-0 fs-13">
              Please provide your identity and bank details to get verified.
            </p>
          </div>
          <div className="card-body px-4 pb-4">
            <form onSubmit={handleSubmit} noValidate>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Aadhaar Number</label>
                  <input
                    type="text"
                    name="aadhaar_number"
                    maxLength={12}
                    className={`form-control ${fieldErrors.aadhaar_number ? "is-invalid" : ""}`}
                    placeholder="12 digit Aadhaar number"
                    value={form.aadhaar_number}
                    onChange={handleChange}
                  />
                  {fieldErrors.aadhaar_number && (
                    <div className="invalid-feedback">{fieldErrors.aadhaar_number}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">PAN Number</label>
                  <input
                    type="text"
                    name="pan_number"
                    maxLength={10}
                    className={`form-control text-uppercase ${fieldErrors.pan_number ? "is-invalid" : ""}`}
                    placeholder="e.g. ABCDE1234F"
                    value={form.pan_number}
                    onChange={handleChange}
                  />
                  {fieldErrors.pan_number && (
                    <div className="invalid-feedback">{fieldErrors.pan_number}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Bank Account Number</label>
                  <input
                    type="text"
                    name="bank_account_number"
                    className={`form-control ${fieldErrors.bank_account_number ? "is-invalid" : ""}`}
                    value={form.bank_account_number}
                    onChange={handleChange}
                  />
                  {fieldErrors.bank_account_number && (
                    <div className="invalid-feedback">{fieldErrors.bank_account_number}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Bank IFSC Code</label>
                  <input
                    type="text"
                    name="bank_ifsc_code"
                    className={`form-control text-uppercase ${fieldErrors.bank_ifsc_code ? "is-invalid" : ""}`}
                    placeholder="e.g. SBIN0001234"
                    value={form.bank_ifsc_code}
                    onChange={handleChange}
                  />
                  {fieldErrors.bank_ifsc_code && (
                    <div className="invalid-feedback">{fieldErrors.bank_ifsc_code}</div>
                  )}
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label fw-semibold">Bank Name</label>
                  <input
                    type="text"
                    name="bank_name"
                    className={`form-control ${fieldErrors.bank_name ? "is-invalid" : ""}`}
                    value={form.bank_name}
                    onChange={handleChange}
                  />
                  {fieldErrors.bank_name && (
                    <div className="invalid-feedback">{fieldErrors.bank_name}</div>
                  )}
                </div>
              </div>

              <hr className="my-3" />
              <h6 className="fw-bold mb-3">Document Uploads</h6>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Aadhaar Front</label>
                  <input
                    type="file"
                    name="aadhaar_front"
                    accept="image/*"
                    className={`form-control ${fieldErrors.aadhaar_front ? "is-invalid" : ""}`}
                    onChange={handleFile}
                  />
                  {fieldErrors.aadhaar_front && (
                    <div className="invalid-feedback">{fieldErrors.aadhaar_front}</div>
                  )}
                  {existingKyc?.aadhaarFront && (
                    <small className="text-muted">Already uploaded. Choose a file only to replace it.</small>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Aadhaar Back</label>
                  <input
                    type="file"
                    name="aadhaar_back"
                    accept="image/*"
                    className={`form-control ${fieldErrors.aadhaar_back ? "is-invalid" : ""}`}
                    onChange={handleFile}
                  />
                  {fieldErrors.aadhaar_back && (
                    <div className="invalid-feedback">{fieldErrors.aadhaar_back}</div>
                  )}
                  {existingKyc?.aadhaarBack && (
                    <small className="text-muted">Already uploaded. Choose a file only to replace it.</small>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">PAN Document</label>
                  <input
                    type="file"
                    name="pan_document"
                    accept="image/*"
                    className={`form-control ${fieldErrors.pan_document ? "is-invalid" : ""}`}
                    onChange={handleFile}
                  />
                  {fieldErrors.pan_document && (
                    <div className="invalid-feedback">{fieldErrors.pan_document}</div>
                  )}
                  {existingKyc?.panDocument && (
                    <small className="text-muted">Already uploaded. Choose a file only to replace it.</small>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Bank Proof</label>
                  <input
                    type="file"
                    name="bank_proof"
                    accept="image/*"
                    className={`form-control ${fieldErrors.bank_proof ? "is-invalid" : ""}`}
                    onChange={handleFile}
                  />
                  {fieldErrors.bank_proof && (
                    <div className="invalid-feedback">{fieldErrors.bank_proof}</div>
                  )}
                  {existingKyc?.bankProof && (
                    <small className="text-muted">Already uploaded. Choose a file only to replace it.</small>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-primary fw-bold mt-2" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit KYC"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Kyc;