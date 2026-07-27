import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios.js";

const approvalColor = { pending: "warning", approved: "success", rejected: "danger" };

function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [emis, setEmis] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/agent/bookings/${id}`)
      .then((res) => {
        setBooking(res.data.booking);
        setEmis(res.data.emis || []);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [id]);

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!booking) return <div className="text-center py-5">Loading...</div>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Booking {booking.bookingNumber}</h4>
          <p className="text-muted mb-0 fs-13">
            Created on {new Date(booking.bookingDate).toLocaleDateString("en-IN")}
          </p>
        </div>
        <Link to="/agent/bookings" className="btn btn-outline-secondary fw-bold">
          Back to Bookings
        </Link>
      </div>

      <div className="row">
        <div className="col-xl-8">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Booking Details</h6>
                <span className={`badge bg-${approvalColor[booking.approvalStatus]}-subtle text-${approvalColor[booking.approvalStatus]} fs-12 px-3 py-2`}>
                  {booking.approvalStatus === "pending" ? "Awaiting Admin Approval" : booking.approvalStatus}
                </span>
              </div>

              {booking.approvalStatus === "rejected" && booking.rejectionReason && (
                <div className="alert alert-danger border-0 mb-3">
                  <strong>Rejection reason:</strong> {booking.rejectionReason}
                </div>
              )}

              <div className="row">
                <div className="col-md-6 mb-3">
                  <small className="text-muted d-block">Customer</small>
                  <span className="fw-semibold">{booking.customer?.name}</span>
                  <div className="text-muted fs-13">{booking.customer?.phone}</div>
                </div>
                <div className="col-md-6 mb-3">
                  <small className="text-muted d-block">Project / Plot</small>
                  <span className="fw-semibold">
                    {booking.project?.name} / Plot {booking.plot?.plotNumber}
                  </span>
                </div>
                <div className="col-md-4 mb-3">
                  <small className="text-muted d-block">Total Area</small>
                  <span className="fw-semibold">{booking.totalArea} sqft</span>
                </div>
                <div className="col-md-4 mb-3">
                  <small className="text-muted d-block">Price / Sqft</small>
                  <span className="fw-semibold">₹{booking.pricePerSqft?.toLocaleString("en-IN")}</span>
                </div>
                <div className="col-md-4 mb-3">
                  <small className="text-muted d-block">Total Amount</small>
                  <span className="fw-semibold">₹{booking.totalAmount?.toLocaleString("en-IN")}</span>
                </div>
                <div className="col-md-4 mb-3">
                  <small className="text-muted d-block">Booking Amount</small>
                  <span className="fw-semibold">₹{booking.bookingAmount?.toLocaleString("en-IN")}</span>
                </div>
                <div className="col-md-4 mb-3">
                  <small className="text-muted d-block">Remaining Amount</small>
                  <span className="fw-semibold">₹{booking.remainingAmount?.toLocaleString("en-IN")}</span>
                </div>
                <div className="col-md-4 mb-3">
                  <small className="text-muted d-block">EMI</small>
                  <span className="fw-semibold">
                    ₹{booking.emiAmount?.toLocaleString("en-IN")} × {booking.emiMonths} months
                  </span>
                </div>
                <div className="col-md-4 mb-3">
                  <small className="text-muted d-block">Payment Mode</small>
                  <span className="fw-semibold text-capitalize">{booking.paymentMode}</span>
                </div>
                {booking.notes && (
                  <div className="col-md-12 mb-1">
                    <small className="text-muted d-block">Notes</small>
                    <span>{booking.notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3">EMI Schedule</h6>
              {emis.length === 0 ? (
                <p className="text-muted mb-0">No EMI records generated yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emis.map((e) => (
                        <tr key={e._id}>
                          <td>{e.emiNumber}</td>
                          <td>{new Date(e.dueDate).toLocaleDateString("en-IN")}</td>
                          <td>₹{e.amount?.toLocaleString("en-IN")}</td>
                          <td>
                            <span className={`badge bg-${e.status === "paid" ? "success" : e.status === "overdue" ? "danger" : "secondary"}-subtle text-${e.status === "paid" ? "success" : e.status === "overdue" ? "danger" : "secondary"}`}>
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default BookingDetail;