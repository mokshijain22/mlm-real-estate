import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios.js";

function TicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/agent/tickets/${id}`)
      .then((res) => setTicket(res.data.ticket))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [id]);

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!ticket) return <div className="text-center py-5">Loading...</div>;

  return (
    <div className="row justify-content-center">
      <div className="col-xl-8">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">{ticket.ticketNumber}</h4>
            <p className="text-muted mb-0 fs-13">
              Raised on {new Date(ticket.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
          <Link to="/agent/tickets" className="btn btn-outline-secondary fw-bold">
            Back to Tickets
          </Link>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <h5 className="fw-bold mb-0">{ticket.subject}</h5>
              <span className={`badge bg-${ticket.status === "open" ? "success" : "secondary"}-subtle text-${ticket.status === "open" ? "success" : "secondary"}`}>
                {ticket.status}
              </span>
            </div>
            <span className="badge bg-primary-subtle text-primary mb-3">{ticket.category}</span>
            <p className="mb-0">{ticket.message}</p>
          </div>
        </div>

        {ticket.adminReply ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-2">
                <iconify-icon icon="solar:chat-round-dots-bold-duotone" className="me-1"></iconify-icon>
                Admin Reply
              </h6>
              <p className="mb-2">{ticket.adminReply}</p>
              {ticket.repliedAt && (
                <small className="text-muted">
                  Replied on {new Date(ticket.repliedAt).toLocaleDateString("en-IN")}
                  {ticket.repliedBy?.name ? ` by ${ticket.repliedBy.name}` : ""}
                </small>
              )}
            </div>
          </div>
        ) : (
          <div className="alert alert-warning border-0 shadow-sm mb-0">
            No reply yet. Our team will get back to you soon.
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketDetail;