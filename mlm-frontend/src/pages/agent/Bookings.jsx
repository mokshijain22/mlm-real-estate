import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

const statusColor = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

function Bookings() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/agent/bookings")
      .then((res) => setBookings(res.data.bookings))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!bookings) return <div className="text-center py-5">Loading...</div>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">My Bookings</h4>
          <p className="text-muted mb-0 fs-13">All plot bookings made by you.</p>
        </div>
        <Link to="/agent/bookings/new" className="btn btn-primary fw-bold">
          <iconify-icon icon="solar:add-circle-bold-duotone" className="me-1"></iconify-icon>
          New Booking
        </Link>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {bookings.length === 0 ? (
            <div className="text-center py-5 text-muted">No bookings yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Booking No.</th>
                    <th>Customer</th>
                    <th>Project / Plot</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b._id}>
                      <td className="fw-semibold">{b.bookingNumber}</td>
                      <td>{b.customer?.name}</td>
                      <td>
                        {b.project?.name} <span className="text-muted">/ Plot {b.plot?.plotNumber}</span>
                      </td>
                      <td>₹{b.totalAmount?.toLocaleString("en-IN")}</td>
                      <td>
                        <span className={`badge bg-${b.status === "active" ? "info" : "secondary"}-subtle text-${b.status === "active" ? "info" : "secondary"}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <span className={`badge bg-${statusColor[b.approvalStatus]}-subtle text-${statusColor[b.approvalStatus]}`}>
                          {b.approvalStatus}
                        </span>
                      </td>
                      <td>{new Date(b.bookingDate).toLocaleDateString("en-IN")}</td>
                      <td>
                        <Link to={`/agent/bookings/${b._id}`} className="btn btn-sm btn-outline-primary">
                          View
                        </Link>
                      </td>
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

export default Bookings;