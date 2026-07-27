import { useEffect, useState } from "react";
import api from "../../api/axios.js";

const rankColorMap = {
  "B.EX": "secondary",
  "S.EX": "primary",
  MGR: "info",
  "S.MGR": "success",
  AD: "warning",
  SD: "danger",
};

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function Referrals() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    api
      .get("/admin/referrals")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  const handleCopy = (key, link) => {
    copyToClipboard(link);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="text-center py-5">Loading...</div>;

  const { admin, personalReferralLink, ranks } = data;

  return (
    <>
      <div className="row align-items-center mb-4">
        <div className="col-sm-8">
          <h3 className="fw-bold mb-1">Referral Links</h3>
          <p className="text-muted mb-0">Share these links to onboard new agents directly under {admin.name}.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom py-3">
          <h4 className="card-title mb-0">Personal Referral Link</h4>
        </div>
        <div className="card-body">
          <div className="input-group">
            <input
              type="text"
              className="form-control border-primary border-dashed bg-primary-subtle bg-opacity-10 py-2 fw-medium"
              value={personalReferralLink}
              readOnly
            />
            <button className="btn btn-primary px-4" onClick={() => handleCopy("personal", personalReferralLink)}>
              <iconify-icon icon="solar:copy-bold-duotone" className="align-middle me-1"></iconify-icon>
              {copiedKey === "personal" ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-muted small mt-2 mb-0">
            Anyone who signs up using this link will be directly referred by you, joining at the base rank.
          </p>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <h4 className="card-title mb-0">Rank-wise Group Referral Links</h4>
        </div>
        <div className="table-responsive">
          <table className="table table-hover table-nowrap align-middle mb-0">
            <thead className="bg-light bg-opacity-50">
              <tr>
                <th className="ps-3 text-muted small">Rank</th>
                <th className="text-muted small">Agents</th>
                <th className="text-muted small">Referral Link</th>
                <th className="text-muted small text-end pe-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {ranks.map((rank) => {
                const color = rankColorMap[rank.abbreviation] || "primary";
                const key = "rank-" + rank._id;
                return (
                  <tr key={rank._id}>
                    <td className="ps-3">
                      <span className={`badge bg-${color}-subtle text-${color} border border-${color} border-opacity-25 fs-13`}>
                        {rank.name} ({rank.abbreviation})
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{rank.agentsCount}</span>
                    </td>
                    <td>
                      <code className="small text-truncate d-inline-block" style={{ maxWidth: "350px" }}>
                        {rank.groupReferralLink}
                      </code>
                    </td>
                    <td className="text-end pe-3">
                      <button
                        className="btn btn-sm btn-soft-primary"
                        onClick={() => handleCopy(key, rank.groupReferralLink)}
                      >
                        <iconify-icon icon="solar:copy-bold-duotone" className="align-middle me-1"></iconify-icon>
                        {copiedKey === key ? "Copied!" : "Copy"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Referrals;