import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios.js";
import { OrgNode, OrgTreeStyles } from "../../components/shared/OrgTree.jsx";

const STORAGE_BASE = "http://localhost:5000/storage/";

function AgentDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState("profile");

  const [profileData, setProfileData] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [rankData, setRankData] = useState(null);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingCode, setEditingCode] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [codeError, setCodeError] = useState(null);
  const [savingCode, setSavingCode] = useState(false);

  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({ position: "", slab_per_sqft: "", gender: "", address: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const loadProfile = () => {
    api
      .get(`/admin/agents/${id}`)
      .then((res) => setProfileData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (tab === "tree" && !treeData) {
      api
        .get(`/admin/agents/${id}/tree`)
        .then((res) => setTreeData(res.data))
        .catch((err) => setError(err.response?.data?.message || err.message));
    }
    if (tab === "rank" && !rankData) {
      api
        .get(`/admin/agents/${id}/rank-history`)
        .then((res) => setRankData(res.data))
        .catch((err) => setError(err.response?.data?.message || err.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, id]);

  const handleAction = (action) => {
    setActionLoading(true);
    api
      .patch(`/admin/agents/${id}/${action}`)
      .then(() => loadProfile())
      .catch((err) => alert(err.response?.data?.message || err.message))
      .finally(() => setActionLoading(false));
  };

  const startEditDetails = () => {
    setDetailsForm({
      position: profileData?.agent?.position || "",
      slab_per_sqft: profileData?.agent?.slabPerSqft ?? "",
      gender: profileData?.agent?.gender || "",
      address: profileData?.agent?.address || "",
    });
    setDetailsError(null);
    setEditingDetails(true);
  };

  const handleSaveDetails = () => {
    setSavingDetails(true);
    setDetailsError(null);
    api
      .patch(`/admin/agents/${id}/details`, detailsForm)
      .then(() => {
        setEditingDetails(false);
        loadProfile();
      })
      .catch((err) => setDetailsError(err.response?.data?.message || err.message))
      .finally(() => setSavingDetails(false));
  };

  const handleSaveCode = () => {
    setSavingCode(true);
    setCodeError(null);
    api
      .patch(`/admin/agents/${id}/referral-code`, { referral_code: newCode })
      .then(() => {
        setEditingCode(false);
        loadProfile();
      })
      .catch((err) => {
        setCodeError(
          err.response?.data?.errors ? Object.values(err.response.data.errors).join(", ") : err.response?.data?.message || err.message
        );
      })
      .finally(() => setSavingCode(false));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!profileData) return <div className="text-center py-5">Loading...</div>;

  const { agent, referrals, assignedProjects, bankDetails, kyc } = profileData;

  const kycDocs = kyc
    ? [
        { label: "Aadhaar Front", value: kyc.aadhaarFront },
        { label: "Aadhaar Back", value: kyc.aadhaarBack },
        { label: "PAN Document", value: kyc.panDocument },
        { label: "Bank Proof", value: kyc.bankProof },
      ]
    : [];

  return (
    <>
      <div className="row align-items-center mb-4">
        <div className="col-sm-8">
          <Link to="/admin/agents" className="text-muted small mb-1 d-inline-block">
            <iconify-icon icon="solar:arrow-left-linear" className="align-middle"></iconify-icon> Back to Executives
          </Link>
          <h3 className="fw-bold mb-1">{agent.name}</h3>
          <div className="d-flex align-items-center gap-2">
            {agent.isKycVerified ? (
              <span className="badge bg-success-subtle text-success">KYC Verified</span>
            ) : (
              <span className="badge bg-warning-subtle text-warning">KYC Pending</span>
            )}
            <span
              className={`badge ${
                agent.status === "active"
                  ? "bg-success-subtle text-success"
                  : agent.status === "blocked"
                  ? "bg-danger-subtle text-danger"
                  : "bg-secondary-subtle text-secondary"
              }`}
            >
              {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
            </span>
          </div>
        </div>
        <div className="col-sm-4 text-sm-end mt-3 mt-sm-0">
          {agent.status === "active" ? (
            <button className="btn btn-danger" disabled={actionLoading} onClick={() => handleAction("deactivate")}>
              Deactivate Executive
            </button>
          ) : (
            <button className="btn btn-success" disabled={actionLoading} onClick={() => handleAction("activate")}>
              Activate Executive
            </button>
          )}
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>
            Profile
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === "tree" ? "active" : ""}`} onClick={() => setTab("tree")}>
            Team Tree
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === "rank" ? "active" : ""}`} onClick={() => setTab("rank")}>
            Rank History
          </button>
        </li>
      </ul>

      {tab === "profile" && (
        <div className="row">
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3">
                <h4 className="card-title mb-0">Executive Details</h4>
              </div>
              <div className="card-body">
                <table className="table table-borderless mb-0">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: "40%" }}>
                        Email
                      </td>
                      <td className="fw-medium">{agent.email}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Phone</td>
                      <td className="fw-medium">{agent.phone || "-"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Referral Code</td>
                      <td className="fw-medium">{agent.referralCode || "-"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Referred By</td>
                      <td className="fw-medium">
                        {agent.referredBy ? (
                          <Link to={`/admin/agents/${agent.referredBy._id}`}>{agent.referredBy.name}</Link>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">System Role</td>
                      <td className="fw-medium">{agent.role?.name || "Executive"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Country</td>
                      <td className="fw-medium">{agent.country || "India"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Rank</td>
                      <td className="fw-medium">{agent.rank?.name || "Unranked"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Position</td>
                      <td className="fw-medium">
                        {editingDetails ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={detailsForm.position}
                            onChange={(e) => setDetailsForm({ ...detailsForm, position: e.target.value })}
                            placeholder="e.g. Sales Executive"
                          />
                        ) : (
                          agent.position || "-"
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Slab / sqft</td>
                      <td className="fw-medium">
                        {editingDetails ? (
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={detailsForm.slab_per_sqft}
                            onChange={(e) => setDetailsForm({ ...detailsForm, slab_per_sqft: e.target.value })}
                            placeholder="e.g. 50"
                          />
                        ) : (
                          agent.slabPerSqft != null ? `₹${agent.slabPerSqft}` : "-"
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Gender</td>
                      <td className="fw-medium">
                        {editingDetails ? (
                          <select
                            className="form-select form-select-sm"
                            value={detailsForm.gender}
                            onChange={(e) => setDetailsForm({ ...detailsForm, gender: e.target.value })}
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          agent.gender || "-"
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Address</td>
                      <td className="fw-medium">
                        {editingDetails ? (
                          <textarea
                            className="form-control form-control-sm"
                            rows="2"
                            value={detailsForm.address}
                            onChange={(e) => setDetailsForm({ ...detailsForm, address: e.target.value })}
                          />
                        ) : (
                          agent.address || "-"
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Status</td>
                      <td className="fw-medium">
                        <span
                          className={`badge ${
                            agent.status === "active"
                              ? "bg-success-subtle text-success"
                              : agent.status === "blocked"
                              ? "bg-danger-subtle text-danger"
                              : "bg-secondary-subtle text-secondary"
                          }`}
                        >
                          {agent.status}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Total Team Size</td>
                      <td className="fw-medium">{agent.totalTeamSize}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Total Group Sales (SQFT)</td>
                      <td className="fw-medium">{Math.round(agent.totalGroupSales)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Joined On</td>
                      <td className="fw-medium">{new Date(agent.createdAt).toLocaleDateString("en-IN")}</td>
                    </tr>
                    {agent.permissions && agent.permissions.length > 0 && (
                      <tr>
                        <td className="text-muted">Permissions</td>
                        <td className="fw-medium">
                          {agent.permissions.map((p) => (
                            <span key={p} className="badge bg-primary-subtle text-primary me-1 mb-1">
                              {p}
                            </span>
                          ))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {detailsError && <div className="alert alert-danger py-2 mt-2 mb-0">{detailsError}</div>}

                <div className="mt-3">
                  {editingDetails ? (
                    <>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        disabled={savingDetails}
                        onClick={handleSaveDetails}
                      >
                        {savingDetails ? "Saving..." : "Save"}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        disabled={savingDetails}
                        onClick={() => setEditingDetails(false)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-sm btn-outline-primary" onClick={startEditDetails}>
                      Edit Position / Slab / Gender / Address
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mt-3">
              <div className="card-header bg-white border-bottom py-3">
                <h4 className="card-title mb-0">Assigned Projects</h4>
              </div>
              <div className="card-body">
                {!assignedProjects || assignedProjects.length === 0 ? (
                  <p className="text-muted mb-0">No projects assigned yet (no bookings made).</p>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {assignedProjects.map((p) => (
                      <li key={p._id} className="d-flex justify-content-between border-bottom py-2">
                        <span className="fw-medium">{p.name}</span>
                        <span className="text-muted fs-13">{p.location || "-"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm mt-3">
              <div className="card-header bg-white border-bottom py-3">
                <h4 className="card-title mb-0">Bank / Payout Details</h4>
              </div>
              <div className="card-body">
                {!bankDetails || !bankDetails.bankAccountNumber ? (
                  <p className="text-muted mb-0">No payout details added yet by this agent.</p>
                ) : (
                  <table className="table table-borderless mb-0">
                    <tbody>
                      <tr>
                        <td className="text-muted" style={{ width: "40%" }}>Bank Name</td>
                        <td className="fw-medium">{bankDetails.bankName || "-"}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Account Number</td>
                        <td className="fw-medium">{bankDetails.bankAccountNumber || "-"}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">IFSC Code</td>
                        <td className="fw-medium">{bankDetails.bankIfscCode || "-"}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm mt-3">
              <div className="card-header bg-white border-bottom py-3">
                <h4 className="card-title mb-0">KYC Details</h4>
              </div>
              <div className="card-body">
                {!kyc ? (
                  <p className="text-muted mb-0">KYC not submitted yet by this agent.</p>
                ) : (
                  <>
                    <table className="table table-borderless mb-3">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: "40%" }}>KYC Status</td>
                          <td className="fw-medium">
                            <span
                              className={`badge ${
                                kyc.status === "approved"
                                  ? "bg-success-subtle text-success"
                                  : kyc.status === "rejected"
                                  ? "bg-danger-subtle text-danger"
                                  : "bg-warning-subtle text-warning"
                              }`}
                            >
                              {kyc.status?.charAt(0).toUpperCase() + kyc.status?.slice(1)}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted">Aadhaar Number</td>
                          <td className="fw-medium">{kyc.aadhaarNumber || "-"}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">PAN Number</td>
                          <td className="fw-medium">{kyc.panNumber || "-"}</td>
                        </tr>
                        {kyc.status === "rejected" && kyc.rejectionReason && (
                          <tr>
                            <td className="text-muted">Rejection Reason</td>
                            <td className="fw-medium text-danger">{kyc.rejectionReason}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <p className="small fw-semibold mb-2">Uploaded Documents</p>
                    <div className="row g-3">
                      {kycDocs.map((doc) => (
                        <div className="col-md-3 col-sm-6" key={doc.label}>
                          <div className="border rounded p-2 text-center h-100 d-flex flex-column">
                            <p className="small fw-semibold mb-2">{doc.label}</p>
                            {doc.value ? (
                              <a
                                href={`${STORAGE_BASE}${doc.value}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-grow-1"
                              >
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
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                <h4 className="card-title mb-0">Direct Referrals ({referrals.length})</h4>
              </div>
              <div className="table-responsive">
                <table className="table table-hover table-nowrap align-middle mb-0">
                  <thead className="bg-light bg-opacity-50">
                    <tr>
                      <th className="ps-3 text-muted small">Name</th>
                      <th className="text-muted small">Email</th>
                      <th className="text-muted small">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">
                          No direct referrals yet.
                        </td>
                      </tr>
                    ) : (
                      referrals.map((r) => (
                        <tr key={r._id}>
                          <td className="ps-3">
                            <Link to={`/admin/agents/${r._id}`}>{r.name}</Link>
                          </td>
                          <td>{r.email}</td>
                          <td>
                            <span
                              className={`badge ${
                                r.status === "active" ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "tree" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            {!treeData ? (
              <div className="text-center py-4">Loading tree...</div>
            ) : (
              <>
                {treeData.uplineChain.length > 0 && (
                  <div className="mb-4">
                    <h5 className="fw-bold mb-2">Upline Chain</h5>
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                      {treeData.uplineChain.map((u, i) => (
                        <span key={u._id} className="d-flex align-items-center gap-2">
                          <span className="badge bg-primary-subtle text-primary px-3 py-2">{u.name}</span>
                          {i < treeData.uplineChain.length - 1 && (
                            <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <h5 className="fw-bold mb-3">Network Tree</h5>
                <OrgTreeStyles />
                <div className="org-tree-scroll mb-4" style={{ minHeight: 260 }}>
                  <div className="org-tree-wrap">
                    {treeData.treeData ? (
                      <OrgNode node={treeData.treeData} isRoot />
                    ) : (
                      <p className="text-muted mb-0">No team data available.</p>
                    )}
                  </div>
                </div>

                <h5 className="fw-bold mb-3">Downline (By Level)</h5>
                {Object.keys(treeData.teamByLevel).length === 0 ? (
                  <div className="text-muted">No downline members yet.</div>
                ) : (
                  <>
                    <div className="mb-4">
                      {(() => {
                        const entries = Object.entries(treeData.teamByLevel);
                        const maxCount = Math.max(1, ...entries.map(([, users]) => users.length));
                        const barHeight = 34;
                        const gap = 14;
                        const chartHeight = entries.length * (barHeight + gap);
                        const chartWidth = 600;
                        const labelWidth = 70;
                        const barAreaWidth = chartWidth - labelWidth - 50;

                        return (
                          <svg
                            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                            width="100%"
                            height={chartHeight}
                            role="img"
                            aria-label="Downline members by level"
                          >
                            {entries.map(([level, users], i) => {
                              const y = i * (barHeight + gap);
                              const width = (users.length / maxCount) * barAreaWidth;
                              return (
                                <g key={level}>
                                  <text
                                    x={0}
                                    y={y + barHeight / 2 + 5}
                                    fontSize="13"
                                    fontWeight="600"
                                    fill="#6c757d"
                                  >
                                    {`Level ${level.replace("level_", "")}`}
                                  </text>
                                  <rect
                                    x={labelWidth}
                                    y={y}
                                    width={barAreaWidth}
                                    height={barHeight}
                                    rx={6}
                                    fill="#f1f3f5"
                                  />
                                  <rect
                                    x={labelWidth}
                                    y={y}
                                    width={Math.max(width, users.length > 0 ? 6 : 0)}
                                    height={barHeight}
                                    rx={6}
                                    fill="#3b82f6"
                                  />
                                  <text
                                    x={labelWidth + barAreaWidth + 12}
                                    y={y + barHeight / 2 + 5}
                                    fontSize="13"
                                    fontWeight="700"
                                    fill="#212529"
                                  >
                                    {users.length}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>
                    {Object.entries(treeData.teamByLevel).map(([level, users]) => (
                    <div key={level} className="mb-3">
                      <h6 className="fw-bold mb-2">
                        <span className="badge bg-info-subtle text-info me-2">
                          Level {level.replace("level_", "")}
                        </span>
                        {users.length} member(s)
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-hover align-middle mb-0">
                          <thead className="bg-light bg-opacity-50">
                            <tr>
                              <th className="ps-3 text-muted small">Name</th>
                              <th className="text-muted small">Email</th>
                              <th className="text-muted small">Referrals</th>
                              <th className="text-muted small">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((u) => (
                              <tr key={u._id}>
                                <td className="ps-3">
                                  <Link to={`/admin/agents/${u._id}`}>{u.name}</Link>
                                </td>
                                <td>{u.email}</td>
                                <td>{u.referralsCount}</td>
                                <td>
                                  <span
                                    className={`badge ${
                                      u.status === "active" ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"
                                    }`}
                                  >
                                    {u.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === "rank" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom py-3">
            <h4 className="card-title mb-0">
              Current Rank: <span className="text-primary">{agent.rank?.name || "N/A"}</span>
            </h4>
          </div>
          <div className="table-responsive">
            <table className="table table-hover table-nowrap align-middle mb-0">
              <thead className="bg-light bg-opacity-50">
                <tr>
                  <th className="ps-3 text-muted small">Date</th>
                  <th className="text-muted small">Old Rank</th>
                  <th className="text-muted small">New Rank</th>
                </tr>
              </thead>
              <tbody>
                {!rankData ? (
                  <tr>
                    <td colSpan="3" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : rankData.rankHistory.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-4 text-muted">
                      No rank changes yet.
                    </td>
                  </tr>
                ) : (
                  rankData.rankHistory.map((rh) => (
                    <tr key={rh._id}>
                      <td className="ps-3 text-muted small">
                        {new Date(rh.upgradedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td>{rh.oldRank?.name || "-"}</td>
                      <td className="fw-bold text-success">{rh.newRank?.name || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default AgentDetail;