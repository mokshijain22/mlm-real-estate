import { useEffect, useState } from "react";
import api from "../api/axios.js";

// Fetches the small badge counts shown in the admin sidebar
// (KYC pending, Withdrawals pending, Support Tickets open, Bookings pending).
export default function useAdminCounts() {
  const [counts, setCounts] = useState({
    kycPending: 0,
    withdrawalsPending: 0,
    ticketsOpen: 0,
    bookingsPending: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [kyc, withdrawals, tickets, bookings] = await Promise.all([
          api.get("/admin/kyc", { params: { status: "pending", page: 1 } }).catch(() => null),
          api.get("/admin/withdrawals", { params: { status: "pending", page: 1 } }).catch(() => null),
          api.get("/admin/tickets", { params: { status: "open", page: 1 } }).catch(() => null),
          api.get("/admin/bookings", { params: { approval_status: "pending", page: 1 } }).catch(() => null),
        ]);

        if (cancelled) return;

        setCounts({
          kycPending: kyc?.data?.meta?.total ?? 0,
          withdrawalsPending: withdrawals?.data?.meta?.total ?? 0,
          ticketsOpen: tickets?.data?.meta?.total ?? 0,
          bookingsPending: bookings?.data?.meta?.total ?? 0,
        });
      } catch {
        // Silently ignore - badges just stay at 0 if this fails.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}