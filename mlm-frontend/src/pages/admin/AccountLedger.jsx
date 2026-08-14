import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import ExportButton from "../../components/shared/ExportButton.jsx";

function money(n) {
  const num = Number(n) || 0;
  if (Math.abs(num) >= 1e7) return "₹" + (num / 1e7).toFixed(2) + " Cr";
  if (Math.abs(num) >= 1e5) return "₹" + (num / 1e5).toFixed(2) + " L";
  if (Math.abs(num) >= 1e3) return "₹" + (num / 1e3).toFixed(2) + " K";
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function moneyFull(n) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function pct(n) {
  return (Number(n) || 0).toFixed(1) + "%";
}
function pointsLabel(p) {
  if (p === "BV") return "Online";
  if (p === "PV") return "Cash";
  return p || "-";
}
function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const TABS = [
  { key: "overview", label: "Overview", icon: "solar:widget-2-bold-duotone" },
  { key: "collections", label: "Collections", icon: "solar:wallet-money-bold-duotone" },
  { key: "dp_emis", label: "DP/EMIs", icon: "solar:checklist-bold-duotone" },
  { key: "receivables", label: "Receivables", icon: "solar:bill-list-bold-duotone" },
  { key: "owner_tds", label: "Owner TDS", icon: "solar:percentage-square-bold-duotone" },
];

function AccountLedger() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [period, setPeriod] = useState("this_month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tab, setTab] = useState("overview");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [collectionRows, setCollectionRows] = useState(null);
  const [collectionMeta, setCollectionMeta] = useState(null);

  const [dpEmiRows, setDpEmiRows] = useState(null);
  const [dpEmiMeta, setDpEmiMeta] = useState(null);

  const [receivableRows, setReceivableRows] = useState(null);
  const [receivableMeta, setReceivableMeta] = useState(null);

  const [ownerTdsRows, setOwnerTdsRows] = useState(null);
  const [ownerTdsMeta, setOwnerTdsMeta] = useState(null);

  useEffect(() => {
    api
      .get("/admin/projects")
      .then((res) => setProjects(res.data.projects || res.data.data || res.data || []))
      .catch(() => {});
  }, []);

  const periodParams = () => ({
    period,
    project_id: projectId || undefined,
    date_from: period === "custom" ? dateFrom || undefined : undefined,
    date_to: period === "custom" ? dateTo || undefined : undefined,
  });

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .get("/admin/account-ledger/overview", {
        params: periodParams(),
      })
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  const loadCollections = () => {
    setCollectionRows(null);
    api
      .get("/admin/account-ledger/collections", {
        params: periodParams(),
      })
      .then((res) => {
        setCollectionRows(res.data.data);
        setCollectionMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  const loadDpEmis = () => {
    setDpEmiRows(null);
    api
      .get("/admin/account-ledger/dp-emis", {
        params: periodParams(),
      })
      .then((res) => {
        setDpEmiRows(res.data.data);
        setDpEmiMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  const loadReceivables = () => {
    setReceivableRows(null);
    api
      .get("/admin/account-ledger/receivables", {
        params: { project_id: projectId || undefined },
      })
      .then((res) => {
        setReceivableRows(res.data.data);
        setReceivableMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  const loadOwnerTds = () => {
    setOwnerTdsRows(null);
    api
      .get("/admin/finance-tds/owner-overview", {
        params: periodParams(),
      })
      .then((res) => {
        setOwnerTdsRows(res.data.data);
        setOwnerTdsMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    if (period !== "custom" || (dateFrom && dateTo)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, projectId, dateFrom, dateTo]);

  useEffect(() => {
    if (period === "custom" && (!dateFrom || !dateTo)) return;
    if (tab === "collections") loadCollections();
    if (tab === "dp_emis") loadDpEmis();
    if (tab === "receivables") loadReceivables();
    if (tab === "owner_tds") loadOwnerTds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, period, projectId, dateFrom, dateTo]);

  return (
    <div>
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label small text-uppercase text-muted">Period</label>
              <select className="form-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="this_month">This month</option>
                <option value="last_month">Last month</option>
                <option value="this_year">This year</option>
                <option value="custom">Custom range</option>
                <option value="all_time">All time</option>
              </select>
            </div>
            {period === "custom" && (
              <>
                <div className="col-md-2">
                  <label className="form-label small text-uppercase text-muted">From</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label small text-uppercase text-muted">To</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className={period === "custom" ? "col-md-3" : "col-md-4"}>
              <label className="form-label small text-uppercase text-muted">Project</label>
              <select className="form-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-warning w-100 text-nowrap" onClick={load} disabled={loading}>
                <iconify-icon icon="solar:refresh-bold" className="align-middle me-1"></iconify-icon>
                {loading ? "..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ul className="nav nav-pills mb-3">
        {TABS.map((t) => (
          <li className="nav-item" key={t.key}>
            <button
              type="button"
              className={`nav-link ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <iconify-icon icon={t.icon} className="align-middle me-1"></iconify-icon>
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {error && <div className="alert alert-danger">{error}</div>}

      {tab === "overview" && (
        <>
          {!data ? (
            <div className="text-center py-5">Loading...</div>
          ) : (
            <>
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <div className="text-muted small text-uppercase">
                        <iconify-icon icon="solar:wallet-money-bold-duotone" className="align-middle me-1"></iconify-icon>
                        Collected
                      </div>
                      <div className="fs-3 fw-bold">{money(data.collected)}</div>
                      <div className="text-muted small">{data.collectedTransactions} transactions · This period</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <div className="text-muted small text-uppercase">
                        <iconify-icon icon="solar:bill-list-bold-duotone" className="align-middle me-1"></iconify-icon>
                        Outstanding
                      </div>
                      <div className="fs-3 fw-bold">{money(data.outstanding)}</div>
                      <div className="text-muted small">of {money(data.plotValueTotal)} plot value</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <div className="text-muted small text-uppercase">
                        <iconify-icon icon="solar:pie-chart-3-bold-duotone" className="align-middle me-1"></iconify-icon>
                        Collection rate
                      </div>
                      <div className="fs-3 fw-bold">{pct(data.collectionRate)}</div>
                      <div className="text-muted small">{money(data.receivables.receivedToDate)} received</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-white py-3">
                      <h5 className="card-title mb-0">
                        <iconify-icon icon="solar:pie-chart-2-bold-duotone" className="align-middle me-1"></iconify-icon>
                        Collections breakdown
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="d-flex justify-content-between border-bottom py-2">
                        <span>Cash</span>
                        <strong>{moneyFull(data.breakdown.cash)}</strong>
                      </div>
                      <div className="d-flex justify-content-between border-bottom py-2">
                        <span>Bank (UPI / NEFT / card)</span>
                        <strong>{moneyFull(data.breakdown.bank)}</strong>
                      </div>
                      <div className="d-flex justify-content-between border-bottom py-2">
                        <span>Cheque</span>
                        <strong>{moneyFull(data.breakdown.cheque)}</strong>
                      </div>
                      <div className="d-flex justify-content-between py-2">
                        <span className="fw-bold">Total collected</span>
                        <strong>{moneyFull(data.breakdown.total)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-white py-3">
                      <h5 className="card-title mb-0">
                        <iconify-icon icon="solar:scale-bold-duotone" className="align-middle me-1"></iconify-icon>
                        Receivables & payout
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <div className="d-flex justify-content-between small mb-1">
                          <span>Collection progress</span>
                          <strong>{pct(data.receivables.collectionProgressPct)}</strong>
                        </div>
                        <div className="progress" style={{ height: 6 }}>
                          <div
                            className="progress-bar bg-success"
                            style={{ width: `${Math.min(data.receivables.collectionProgressPct, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between py-1">
                        <span className="text-muted">Plot value (All projects)</span>
                        <strong>{moneyFull(data.receivables.plotValueTotal)}</strong>
                      </div>
                      <div className="d-flex justify-content-between py-1">
                        <span className="text-muted">Received to date</span>
                        <strong>{moneyFull(data.receivables.receivedToDate)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === "collections" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">
              <iconify-icon icon="solar:wallet-money-bold-duotone" className="align-middle me-1"></iconify-icon>
              Collections
            </h5>
            <div className="d-flex align-items-center gap-3">
              {collectionMeta && (
                <span className="text-muted small">
                  {collectionMeta.count} entries · {moneyFull(collectionMeta.total)}
                </span>
              )}
              <ExportButton
                url="/admin/account-ledger/collections/export"
                params={periodParams()}
                title="Collections Report"
                filenamePrefix="collections"
              />
            </div>
          </div>
          <div className="card-body">
            {!collectionRows ? (
              <div className="text-center py-4">Loading...</div>
            ) : collectionRows.length === 0 ? (
              <div className="text-center text-muted py-4">No collections in this period.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-centered table-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Reference</th>
                      <th>Customer</th>
                      <th>Project</th>
                      <th>Mode</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectionRows.map((r, i) => (
                      <tr key={i}>
                        <td>{fmtDate(r.date)}</td>
                        <td>{r.type}</td>
                        <td>{r.reference}</td>
                        <td>{r.customer}</td>
                        <td>{r.project}</td>
                        <td className="text-capitalize">{(r.mode || "-").replace("_", " ")}</td>
                        <td className="text-end">{moneyFull(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "dp_emis" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">
              <iconify-icon icon="solar:checklist-bold-duotone" className="align-middle me-1"></iconify-icon>
              DP / EMIs
            </h5>
            <div className="d-flex align-items-center gap-3">
              {dpEmiMeta && (
                <span className="text-muted small">
                  {dpEmiMeta.count} entries · Due {moneyFull(dpEmiMeta.totalDue)} · Pending {moneyFull(dpEmiMeta.totalPending)} · Overdue{" "}
                  {moneyFull(dpEmiMeta.totalOverdue)}
                </span>
              )}
              <ExportButton
                url="/admin/account-ledger/dp-emis/export"
                params={periodParams()}
                title="DP / EMIs Report"
                filenamePrefix="dp_emis"
              />
            </div>
          </div>
          <div className="card-body">
            {!dpEmiRows ? (
              <div className="text-center py-4">Loading...</div>
            ) : dpEmiRows.length === 0 ? (
              <div className="text-center text-muted py-4">No DP/EMI items due in this period.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-centered table-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Due date</th>
                      <th>Type</th>
                      <th>Reference</th>
                      <th>Customer</th>
                      <th>Project</th>
                      <th>Status</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dpEmiRows.map((r, i) => (
                      <tr key={i}>
                        <td>{fmtDate(r.dueDate)}</td>
                        <td>{r.type}</td>
                        <td>{r.reference}</td>
                        <td>{r.customer}</td>
                        <td>{r.project}</td>
                        <td>
                          {r.status === "paid" ? (
                            <span className="badge bg-success-subtle text-success">Paid</span>
                          ) : r.status === "overdue" ? (
                            <span className="badge bg-danger-subtle text-danger">Overdue</span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning">Pending</span>
                          )}
                        </td>
                        <td className="text-end">{moneyFull(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "receivables" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">
              <iconify-icon icon="solar:bill-list-bold-duotone" className="align-middle me-1"></iconify-icon>
              Receivables
            </h5>
            <div className="d-flex align-items-center gap-3">
              {receivableMeta && (
                <span className="text-muted small">
                  {receivableMeta.count} bookings · {moneyFull(receivableMeta.totalOutstanding)} outstanding
                </span>
              )}
              <ExportButton
                url="/admin/account-ledger/receivables/export"
                params={{ project_id: projectId || undefined }}
                title="Receivables Report"
                filenamePrefix="receivables"
              />
            </div>
          </div>
          <div className="card-body">
            {!receivableRows ? (
              <div className="text-center py-4">Loading...</div>
            ) : receivableRows.length === 0 ? (
              <div className="text-center text-muted py-4">No outstanding receivables.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-centered table-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Reference</th>
                      <th>Customer</th>
                      <th>Project</th>
                      <th className="text-end">Total amount</th>
                      <th className="text-end">Paid</th>
                      <th className="text-end">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivableRows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.reference}</td>
                        <td>{r.customer}</td>
                        <td>{r.project}</td>
                        <td className="text-end">{moneyFull(r.totalAmount)}</td>
                        <td className="text-end">{moneyFull(r.paid)}</td>
                        <td className="text-end fw-bold text-danger">{moneyFull(r.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "owner_tds" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">
              <iconify-icon icon="solar:percentage-square-bold-duotone" className="align-middle me-1"></iconify-icon>
              Owner TDS
            </h5>
            <div className="d-flex align-items-center gap-3">
              {ownerTdsMeta && (
                <span className="text-muted small">
                  {ownerTdsMeta.count} entries · Rate {pct(ownerTdsMeta.currentRate)} · Gross {moneyFull(ownerTdsMeta.totalGross)} · TDS {moneyFull(ownerTdsMeta.totalTds)} · Net {moneyFull(ownerTdsMeta.totalNet)}
                </span>
              )}
              <ExportButton
                url="/admin/finance-tds/owner-overview/export"
                params={periodParams()}
                title="Owner TDS Report"
                filenamePrefix="owner_tds"
              />
            </div>
          </div>
          <div className="card-body">
            {!ownerTdsRows ? (
              <div className="text-center py-4">Loading...</div>
            ) : ownerTdsRows.length === 0 ? (
              <div className="text-center text-muted py-4">No owner TDS entries in this period.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-centered table-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Reference</th>
                      <th>Project</th>
                      <th>Plot</th>
                      <th>Points</th>
                      <th className="text-end">Gross Amount</th>
                      <th className="text-end">TDS Amount</th>
                      <th className="text-end">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerTdsRows.map((r, i) => (
                      <tr key={i}>
                        <td>{fmtDate(r.date)}</td>
                        <td>{r.reference}</td>
                        <td>{r.project}</td>
                        <td>{r.plot}</td>
                        <td>{pointsLabel(r.pointsType)}</td>
                        <td className="text-end">{moneyFull(r.grossAmount)}</td>
                        <td className="text-end text-danger">{moneyFull(r.tdsAmount)}</td>
                        <td className="text-end fw-bold">{moneyFull(r.netAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountLedger;