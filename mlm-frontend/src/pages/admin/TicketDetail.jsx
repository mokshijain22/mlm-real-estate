import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios.js";

const categoryLabels = {
  commission: "Commission",
  kyc: "KYC",
  booking: "Booking",
  general: "General",
};

function TicketDetail() {
  const { id } = useParams();

  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState(null);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    api
      .get(`/admin/tickets/${id}`)
      .then((res) => setTicket(res.data.ticket))
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleReply = (e) => {
    e.preventDefault();
    setReplyError("");
    setActionLoading(true);
    api
      .patch(`/admin/tickets/${id}/reply`, { admin_reply: reply })
      .then(() => {
        setReply("");
        load();
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setReplyError(Object.values(err.response.data.errors)[0]);
        } else {
          alert(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setActionLoading(false));
  };

  const handleClose = () => {
    if (!window.confirm("Close this ticket?")) return;
    setActionLoading(true);
    api
      .patch(`/admin/tickets/${id}/close`)
      .then(() => load())
      .catch((err) => alert(err.response?.data?.message || err.message))
      .finally(() => setActionLoading(false));
  };

  const handleReopen = () => {
    setActionLoading(true);
    api
      .patch(`/admin/tickets/${id}/reopen`)
      .then(() => load())
      .catch((err) => alert(err.response?.data?.message || err.message))
      .finally(() => setActionLoading(false));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!ticket) return <div className="text-center py-5">Loading...</div>;

  return (
    <>
      <div className="row align-items-center mb-4">
        <div className="col-sm-8">
          <Link to="/admin/tickets" className="text-muted small mb-1 d-inline-block">
            <iconify-icon icon="solar:arrow-left-linear" className="align-middle"></iconify-icon> Back to Tickets
          </Link>
          <h3 className="fw-bold mb-1">
            #{ticket.ticketNumber} - {ticket.subject}
          </h3>
          <div className="d-flex align-items-center gap-2">
            <span className={`badge ${ticket.status === "open" ? "bg-warning-subtle text-warning" : "bg-success-subtle text-success"}`}>
              {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
            </span>
            <span className="badge bg-secondary-subtle text-secondary">{categoryLabels[ticket.category] || ticket.category}</span>
          </div>
        </div>
        <div className="col-sm-4 text-sm-end mt-3 mt-sm-0">
          {ticket.status === "open" ? (
            <button className="btn btn-outline-secondary" disabled={actionLoading} onClick={handleClose}>
              Close Ticket
            </button>
          ) : (
            <button className="btn btn-outline-primary" disabled={actionLoading} onClick={handleReopen}>
              Reopen Ticket
            </button>
          )}
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-white border-bottom py-3">
              <h4 className="card-title mb-0">Original Message</h4>
            </div>
            <div className="card-body">
              <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                {ticket.message}
              </p>
            </div>
          </div>

          {ticket.adminReply && (
            <div className="card border-0 shadow-sm mb-3 border-start border-4 border-success">
              <div className="card-header bg-white border-bottom py-3">
                <h4 className="card-title mb-0">Admin Reply</h4>
                <p className="text-muted small mb-0">
                  By {ticket.repliedBy?.name} on {new Date(ticket.repliedAt).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="card-body">
                <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                  {ticket.adminReply}
                </p>
              </div>
            </div>
          )}

          {ticket.status === "open" && !ticket.adminReply && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3">
                <h4 className="card-title mb-0">Reply to Agent</h4>
              </div>
              <div className="card-body">
                <form onSubmit={handleReply}>
                  <textarea
                    className={`form-control ${replyError ? "is-invalid" : ""}`}
                    rows="4"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your reply here..."
                    required
                  ></textarea>
                  {replyError && <div className="invalid-feedback">{replyError}</div>}
                  <p className="text-muted small mt-1">Replying will automatically close this ticket.</p>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? "Sending..." : "Send Reply"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h4 className="card-title mb-0">Agent Info</h4>
            </div>
            <div className="card-body">
              <table className="table table-borderless mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted" style={{ width: "40%" }}>
                      Name
                    </td>
                    <td className="fw-medium">{ticket.agent?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Email</td>
                    <td className="fw-medium">{ticket.agent?.email}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Phone</td>
                    <td className="fw-medium">{ticket.agent?.phone || "-"}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Created On</td>
                    <td className="fw-medium">{new Date(ticket.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default TicketDetail;