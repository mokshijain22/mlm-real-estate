import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios.js";

function BookingCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [plots, setPlots] = useState([]);

  const [form, setForm] = useState({
    customer_id: searchParams.get("customer_id") || "",
    plot_id: "",
    price_per_sqft: "",
    booking_amount: "",
    emi_months: "",
    payment_mode: "cash",
    notes: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/agent/bookings/create-data", {
        params: { customer_id: searchParams.get("customer_id") || undefined },
      })
      .then((res) => {
        setCustomers(res.data.customers);
        setPlots(res.data.plots);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPlot = plots.find((p) => p._id === form.plot_id);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // auto-fill price per sqft when plot changes
      if (name === "plot_id") {
        const plot = plots.find((p) => p._id === value);
        if (plot) next.price_per_sqft = plot.pricePerSqft || "";
      }
      return next;
    });
  };

  const totalAmount =
    selectedPlot && form.price_per_sqft
      ? (selectedPlot.totalArea * Number(form.price_per_sqft)).toLocaleString("en-IN")
      : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setError(null);

    api
      .post("/agent/bookings", form)
      .then((res) => {
        navigate(`/agent/bookings/${res.data.data._id}`);
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setFieldErrors(err.response.data.errors);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="text-center py-5">Loading...</div>;

  return (
    <div className="row justify-content-center">
      <div className="col-xl-8">
        <h4 className="fw-bold mb-1">New Booking</h4>
        <p className="text-muted mb-4 fs-13">Create a plot booking for your customer.</p>

        {error && <div className="alert alert-danger border-0 shadow-sm">{error}</div>}

        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <form onSubmit={handleSubmit} noValidate>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Customer</label>
                  <select
                    name="customer_id"
                    className={`form-select ${fieldErrors.customer_id ? "is-invalid" : ""}`}
                    value={form.customer_id}
                    onChange={handleChange}
                  >
                    <option value="">Select customer</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.customer_id && <div className="invalid-feedback">{fieldErrors.customer_id}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Plot</label>
                  <select
                    name="plot_id"
                    className={`form-select ${fieldErrors.plot_id ? "is-invalid" : ""}`}
                    value={form.plot_id}
                    onChange={handleChange}
                  >
                    <option value="">Select available plot</option>
                    {plots.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.project?.name} — Plot {p.plotNumber} ({p.totalArea} sqft)
                      </option>
                    ))}
                  </select>
                  {fieldErrors.plot_id && <div className="invalid-feedback">{fieldErrors.plot_id}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Price per Sqft (₹)</label>
                  <input
                    type="number"
                    name="price_per_sqft"
                    className={`form-control ${fieldErrors.price_per_sqft ? "is-invalid" : ""}`}
                    value={form.price_per_sqft}
                    onChange={handleChange}
                  />
                  {fieldErrors.price_per_sqft && <div className="invalid-feedback">{fieldErrors.price_per_sqft}</div>}
                  {totalAmount && <small className="text-muted">Total: ₹{totalAmount}</small>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Booking Amount (₹)</label>
                  <input
                    type="number"
                    name="booking_amount"
                    className={`form-control ${fieldErrors.booking_amount ? "is-invalid" : ""}`}
                    value={form.booking_amount}
                    onChange={handleChange}
                  />
                  {fieldErrors.booking_amount && <div className="invalid-feedback">{fieldErrors.booking_amount}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">EMI Months</label>
                  <input
                    type="number"
                    name="emi_months"
                    min="1"
                    max="360"
                    className={`form-control ${fieldErrors.emi_months ? "is-invalid" : ""}`}
                    value={form.emi_months}
                    onChange={handleChange}
                  />
                  {fieldErrors.emi_months && <div className="invalid-feedback">{fieldErrors.emi_months}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Payment Mode</label>
                  <select
                    name="payment_mode"
                    className={`form-select ${fieldErrors.payment_mode ? "is-invalid" : ""}`}
                    value={form.payment_mode}
                    onChange={handleChange}
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                  {fieldErrors.payment_mode && <div className="invalid-feedback">{fieldErrors.payment_mode}</div>}
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label fw-semibold">Notes (optional)</label>
                  <textarea
                    name="notes"
                    rows="3"
                    className="form-control"
                    value={form.notes}
                    onChange={handleChange}
                  ></textarea>
                </div>
              </div>

              <button type="submit" className="btn btn-primary fw-bold mt-2" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Booking"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingCreate;