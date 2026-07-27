import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios.js";

const STORAGE_BASE = "http://localhost:5000/storage/";

function KycDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [kyc, setKyc] = useState(null);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  const load = () => {
    api
      .get(`/admin/kyc/${id}`)
      .then((res) => setKyc(res.data.kyc))
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleApprove = () => {
    if (!window.confirm("Approve this KYC application?")) return;
    setActionLoading(true);
    api
      .patch(`/admin/kyc/${id}/approve`)
      .then(() => load())
      .catch((err) => alert(err.response?.data?.message || err.message))
      .finally(() => setActionLoading(false));
  };

  const handleReject = (e) => {
    e.preventDefault();
    setRejectError("");
    setActionLoading(true);
    api
      .patch(`/admin/kyc/${id}/reject`, { rejection_reason: rejectionReason })
      .then(() => {
        setShowRejectForm(false);
        setRejectionReason("");
        load();
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setRejectError(Object.values(err.response.data.errors)[0]);
        } else {
          alert(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setActionLoading(false));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!kyc) return <div className="text-center py-5">Loading...</div>;

  const docs = [
    { label: "Aadhaar Front", value: kyc.aadhaarFront },
    { label: "Aadhaar Back", value: kyc.aadhaarBack },
    { label: "PAN Document", value: kyc.panDocument },
    { label: "Bank Proof", value: kyc.bankProof },
  ];

  return (
    <>
      <div className="row align-items-center mb-4">
        <div className="col-sm-8">
          <Link to="/admin/kyc" className="text-muted small mb-1 d-inline-block">
            <iconify-icon icon="solar:arrow-left-linear" className="align-middle"></iconify-icon> Back to KYC List
          </Link>
          <h3 className="fw-bold mb-1">{kyc.user?.name}</h3>
          <span
            className={`badge ${
              kyc.status === "approved"
                ? "bg-success-subtle text-success"
                : kyc.status === "rejected"
                ? "bg-danger-subtle text-danger"
                : "bg-warning-subtle text-warning"
            }`}
          >
            {kyc.status.charAt(0).toUpperCase() + kyc.status.slice(1)}
          </span>
        </div>
        {kyc.status === "pending" && (
          <div className="col-sm-4 text-sm-end mt-3 mt-sm-0 d-flex gap-2 justify-content-sm-end">
            <button className="btn btn-success" disabled={actionLoading} onClick={handleApprove}>
              <iconify-icon icon="solar:check-circle-bold-duotone" className="align-middle me-1"></iconify-icon>
              Approve
            </button>
            <button
              className="btn btn-danger"
              disabled={actionLoading}
              onClick={() => setShowRejectForm(!showRejectForm)}
            >
              <iconify-icon icon="solar:close-circle-bold-duotone" className="align-middle me-1"></iconify-icon>
              Reject
            </button>
          </div>
        )}
      </div>

      {kyc.status === "rejected" && kyc.rejectionReason && (
        <div className="alert alert-danger border-0 shadow-sm">
          <strong>Rejection Reason:</strong> {kyc.rejectionReason}
        </div>
      )}

      {showRejectForm && (
        <div className="card border-0 shadow-sm mb-3 border-danger">
          <div className="card-body">
            <form onSubmit={handleReject}>
              <label className="form-label fw-semibold">Rejection Reason</label>
              <textarea
                className={`form-control ${rejectError ? "is-invalid" : ""}`}
                rows="3"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this KYC is being rejected..."
                required
              ></textarea>
              {rejectError && <div className="invalid-feedback">{rejectError}</div>}
              <div className="mt-2 d-flex gap-2">
                <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                  {actionLoading ? "Submitting..." : "Confirm Reject"}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowRejectForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="row">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h4 className="card-title mb-0">Applicant Info</h4>
            </div>
            <div className="card-body">
              <table className="table table-borderless mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted" style={{ width: "40%" }}>
                      Name
                    </td>
                    <td className="fw-medium">{kyc.user?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Email</td>
                    <td className="fw-medium">{kyc.user?.email}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Phone</td>
                    <td className="fw-medium">{kyc.user?.phone || "-"}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Aadhaar Number</td>
                    <td className="fw-medium">{kyc.aadhaarNumber || "-"}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">PAN Number</td>
                    <td className="fw-medium">{kyc.panNumber || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h4 className="card-title mb-0">Bank Details</h4>
            </div>
            <div className="card-body">
              <table className="table table-borderless mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted" style={{ width: "40%" }}>
                      Bank Name
                    </td>
                    <td className="fw-medium">{kyc.bankName || "-"}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Account Number</td>
                    <td className="fw-medium">{kyc.bankAccountNumber || "-"}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">IFSC Code</td>
                    <td className="fw-medium">{kyc.bankIfscCode || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <h4 className="card-title mb-0">Uploaded Documents</h4>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {docs.map((doc) => (
              <div className="col-md-3 col-sm-6" key={doc.label}>
                <div className="border rounded p-2 text-center h-100 d-flex flex-column">
                  <p className="small fw-semibold mb-2">{doc.label}</p>
                  {doc.value ? (
                    <a href={`${STORAGE_BASE}${doc.value}`} target="_blank" rel="noreferrer" className="flex-grow-1">
                      <img
                        src={`${STORAGE_BASE}${doc.value}`}
                        alt={doc.label}
                        className="img-fluid rounded"
                        style={{ maxHeight: "150px", objectFit: "cover" }}
                      />
                    </a>
                  ) : (
                    <div className="flex-grow-1 d-flex align-items-center justify-content-center text-muted small">
                      Not uploaded
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default KycDetail;