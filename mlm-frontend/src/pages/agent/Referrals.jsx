import { useEffect, useState } from "react";
import api from "../../api/axios.js";

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function Referrals() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .get("/agent/referrals")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!data) return <div className="text-center py-5">Loading...</div>;

  const { agent, directReferrals, totalTeam, activeMembers, pendingKyc, eligibleRanks, kycVerified } = data;
  const referralLink = `${window.location.origin}/register?ref=${agent.referralCode}`;

  const handleCopy = () => {
    copyToClipboard(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <h4 className="fw-bold mb-1">Referrals</h4>
      <p className="text-muted mb-4 fs-13">Grow your team by sharing your referral link.</p>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <h6 className="fw-bold mb-2">Your Referral Link</h6>

          {!kycVerified ? (
            <div className="alert alert-warning border-0 mb-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span>Complete your KYC verification to unlock your referral link.</span>
              <a href="/agent/kyc" className="btn btn-sm btn-warning fw-bold">
                Complete KYC Now
              </a>
            </div>
          ) : (
            <div className="input-group">
              <input type="text" className="form-control" value={referralLink} readOnly />
              <button className="btn btn-outline-primary fw-bold" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}

          {kycVerified && eligibleRanks?.length > 0 && (
            <div className="mt-4">
              <h6 className="fw-bold fs-13 text-muted mb-2">Rank-wise Referral Links</h6>
              <p className="text-muted fs-13 mb-3">
                You can place new joiners into your own rank or any rank below it.
              </p>
              {eligibleRanks.map((r) => {
                const rankLink = `${window.location.origin}/register?ref=${agent.referralCode}&rank=${r._id}`;
                return (
                  <div key={r._id} className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge bg-secondary-subtle text-secondary" style={{ width: 70 }}>
                      {r.abbreviation}
                    </span>
                    <input type="text" className="form-control form-control-sm" value={rankLink} readOnly />
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => copyToClipboard(rankLink)}
                    >
                      Copy
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <span className="text-muted fs-13">Total Team</span>
              <h2 className="fw-bold mb-0">{totalTeam}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <span className="text-muted fs-13">Active Members</span>
              <h2 className="fw-bold mb-0 text-success">{activeMembers}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <span className="text-muted fs-13">Pending KYC</span>
              <h2 className="fw-bold mb-0 text-warning">{pendingKyc}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="p-4 pb-0">
            <h6 className="fw-bold mb-0">Direct Referrals</h6>
          </div>
          {directReferrals.length === 0 ? (
            <div className="text-center py-5 text-muted">No direct referrals yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 mt-3">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Rank</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {directReferrals.map((r) => (
                    <tr key={r._id}>
                      <td className="fw-semibold">{r.name}</td>
                      <td>{r.email}</td>
                      <td>{r.rank?.abbreviation || "—"}</td>
                      <td>
                        <span className={`badge bg-${r.status === "active" ? "success" : "secondary"}-subtle text-${r.status === "active" ? "success" : "secondary"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
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

export default Referrals;