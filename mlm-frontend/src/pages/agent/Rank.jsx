import { useEffect, useState } from "react";
import api from "../../api/axios.js";

function Rank() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/agent/rank")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!data) return <div className="text-center py-5">Loading...</div>;

  const { agent, rankHistory, nextRank, progressPercent, sqftNeeded, allRanks } = data;

  return (
    <>
      <h4 className="fw-bold mb-1">My Rank</h4>
      <p className="text-muted mb-4 fs-13">Track your rank progress and history.</p>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="row align-items-center">
            <div className="col-md-4 text-center border-end">
              <span className="text-muted fs-13 d-block mb-1">Current Rank</span>
              <h3 className="fw-bold mb-0">{agent.rank?.name || "Unranked"}</h3>
              <span className="badge bg-primary-subtle text-primary mt-2">
                {agent.rank?.abbreviation || "—"}
              </span>
            </div>
            <div className="col-md-8">
              {nextRank ? (
                <>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="fw-semibold">Progress to {nextRank.name}</span>
                    <span className="fw-semibold">{progressPercent}%</span>
                  </div>
                  <div className="progress" style={{ height: 10 }}>
                    <div
                      className="progress-bar bg-primary"
                      role="progressbar"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <p className="text-muted fs-13 mt-2 mb-0">
                    {sqftNeeded > 0
                      ? `${sqftNeeded.toLocaleString("en-IN")} more group sales needed to reach ${nextRank.name}`
                      : "You are eligible for the next rank!"}
                  </p>
                </>
              ) : (
                <p className="fw-semibold text-success mb-0">
                  🎉 You've reached the highest rank available!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-7 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3">All Ranks</h6>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Rank</th>
                      <th>Min Group Sales</th>
                      <th>Min Team</th>
                      <th>BV / PV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRanks.map((r) => (
                      <tr key={r._id} className={r._id === agent.rank?._id ? "table-primary" : ""}>
                        <td className="fw-semibold">
                          {r.name} <span className="text-muted fs-12">({r.abbreviation})</span>
                        </td>
                        <td>{r.minGroupSales?.toLocaleString("en-IN")}</td>
                        <td>{r.minTeamSize}</td>
                        <td>
                          {r.bvPoints} / {r.pvPoints}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-5 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3">Rank History</h6>
              {rankHistory.length === 0 ? (
                <p className="text-muted mb-0">No rank changes yet.</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {rankHistory.map((h) => (
                    <li key={h._id} className="d-flex justify-content-between border-bottom py-2">
                      <span>
                        {h.oldRank?.abbreviation || "—"} → <strong>{h.newRank?.abbreviation}</strong>
                      </span>
                      <span className="text-muted fs-13">
                        {new Date(h.upgradedAt).toLocaleDateString("en-IN")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Rank;