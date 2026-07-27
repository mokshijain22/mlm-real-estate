import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios.js";

function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/agent/customers/${id}`)
      .then((res) => {
        setCustomer(res.data.customer);
        setBookings(res.data.bookings || []);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [id]);

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!customer) return <div className="text-center py-5">Loading...</div>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">{customer.name}</h4>
          <p className="text-muted mb-0 fs-13">Customer Code: {customer.customerCode}</p>
        </div>
        <div className="d-flex gap-2">
          <Link to={`/agent/bookings/new?customer_id=${customer._id}`} className="btn btn-primary fw-bold">
            New Booking
          </Link>
          <Link to="/agent/customers" className="btn btn-outline-secondary fw-bold">
            Back
          </Link>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-4 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3">Contact Details</h6>
              <div className="mb-2">
                <small className="text-muted d-block">Phone</small>
                <span className="fw-semibold">{customer.phone}</span>
              </div>
              {customer.alternatePhone && (
                <div className="mb-2">
                  <small className="text-muted d-block">Alternate Phone</small>
                  <span className="fw-semibold">{customer.alternatePhone}</span>
                </div>
              )}
              {customer.email && (
                <div className="mb-2">
                  <small className="text-muted d-block">Email</small>
                  <span className="fw-semibold">{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="mb-2">
                  <small className="text-muted d-block">Address</small>
                  <span className="fw-semibold">
                    {customer.address}
                    {customer.city ? `, ${customer.city}` : ""}
                    {customer.state ? `, ${customer.state}` : ""}
                    {customer.pincode ? ` - ${customer.pincode}` : ""}
                  </span>
                </div>
              )}
              {customer.aadhaarNumber && (
                <div className="mb-2">
                  <small className="text-muted d-block">Aadhaar</small>
                  <span className="fw-semibold">{customer.aadhaarNumber}</span>
                </div>
              )}
              {customer.panNumber && (
                <div className="mb-2">
                  <small className="text-muted d-block">PAN</small>
                  <span className="fw-semibold">{customer.panNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-8 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3">Bookings</h6>
              {bookings.length === 0 ? (
                <p className="text-muted mb-0">No bookings for this customer yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Booking No.</th>
                        <th>Project / Plot</th>
                        <th>Amount</th>
                        <th>Approval</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b._id}>
                          <td className="fw-semibold">{b.bookingNumber}</td>
                          <td>
                            {b.project?.name} / {b.plot?.plotNumber}
                          </td>
                          <td>₹{b.totalAmount?.toLocaleString("en-IN")}</td>
                          <td>
                            <span className="badge bg-secondary-subtle text-secondary">{b.approvalStatus}</span>
                          </td>
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
        </div>
      </div>
    </>
  );
}

export default CustomerDetail;