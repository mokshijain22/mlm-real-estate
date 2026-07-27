import { Routes, Route, Navigate } from "react-router-dom";
import AgentLayout from "./layouts/AgentLayout.jsx";
import Dashboard from "./pages/agent/Dashboard.jsx";
import Kyc from "./pages/agent/Kyc.jsx";
import Bookings from "./pages/agent/Bookings.jsx";
import BookingCreate from "./pages/agent/BookingCreate.jsx";
import BookingDetail from "./pages/agent/BookingDetail.jsx";
import Wallet from "./pages/agent/Wallet.jsx";
import Commissions from "./pages/agent/Commissions.jsx";
import Referrals from "./pages/agent/Referrals.jsx";
import Rank from "./pages/agent/Rank.jsx";
import Customers from "./pages/agent/Customers.jsx";
import CustomerDetail from "./pages/agent/CustomerDetail.jsx";
import Tickets from "./pages/agent/Tickets.jsx";
import TicketDetail from "./pages/agent/TicketDetail.jsx";
import Team from "./pages/agent/Team.jsx";
import Projects from "./pages/agent/Projects.jsx";
import ProjectDetail from "./pages/agent/ProjectDetail.jsx";
import Profile from "./pages/agent/Profile.jsx";
import Login from "./pages/auth/Login.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import Register from "./pages/auth/Register.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/Dashboard.jsx";
import Agents from "./pages/admin/Agents.jsx";
import AgentDetail from "./pages/admin/AgentDetail.jsx";
import AdminKyc from "./pages/admin/Kyc.jsx";
import AdminKycDetail from "./pages/admin/KycDetail.jsx";
import Ranks from "./pages/admin/Ranks.jsx";
import AdminReferrals from "./pages/admin/Referrals.jsx";
import Withdrawals from "./pages/admin/Withdrawals.jsx";
import WithdrawalDetail from "./pages/admin/WithdrawalDetail.jsx";
import AdminTickets from "./pages/admin/Tickets.jsx";
import AdminTicketDetail from "./pages/admin/TicketDetail.jsx";
import AdminCustomers from "./pages/admin/Customers.jsx";
import AdminBookings from "./pages/admin/Bookings.jsx";
import AdminBookingDetail from "./pages/admin/BookingDetail.jsx";
import AdminBookingCreate from "./pages/admin/BookingCreate.jsx";
import AdminBookingsPending from "./pages/admin/BookingsPending.jsx";import EmiManagement from "./pages/admin/EmiManagement.jsx";
import SubAdmins from "./pages/admin/SubAdmins.jsx";
import SubAdminCreate from "./pages/admin/SubAdminCreate.jsx";
import SubAdminEdit from "./pages/admin/SubAdminEdit.jsx";
import AuditLogs from "./pages/admin/AuditLogs.jsx";
import Settings from "./pages/admin/Settings.jsx";
import AdminProfile from "./pages/admin/Profile.jsx";
import ReportsOverview from "./pages/admin/ReportsOverview.jsx";
import EmiCollectionsReport from "./pages/admin/EmiCollectionsReport.jsx";
import CommissionsReport from "./pages/admin/CommissionsReport.jsx";
import AgentEarningsReport from "./pages/admin/AgentEarningsReport.jsx";
import ProjectSalesReport from "./pages/admin/ProjectSalesReport.jsx";
import PayoutsReport from "./pages/admin/PayoutsReport.jsx";
import AdminProjects from "./pages/admin/Projects.jsx";
import ProjectCreate from "./pages/admin/ProjectCreate.jsx";
import ProjectEdit from "./pages/admin/ProjectEdit.jsx";
import ProjectShow from "./pages/admin/ProjectShow.jsx";
import PlotsList from "./pages/admin/PlotsList.jsx";
import PlotCreate from "./pages/admin/PlotCreate.jsx";
import PlotEdit from "./pages/admin/PlotEdit.jsx";
import PlotShow from "./pages/admin/PlotShow.jsx";
import ProjectMap from "./pages/admin/ProjectMap.jsx";
import ProjectBuilder from "./pages/admin/ProjectBuilder.jsx";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        element={
          <ProtectedRoute>
            <AgentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/agent/dashboard" element={<Dashboard />} />
        <Route path="/agent/kyc" element={<Kyc />} />
        <Route path="/agent/bookings" element={<Bookings />} />
        <Route path="/agent/bookings/new" element={<BookingCreate />} />
        <Route path="/agent/bookings/:id" element={<BookingDetail />} />
        <Route path="/agent/wallet" element={<Wallet />} />
        <Route path="/agent/commissions" element={<Commissions />} />
        <Route path="/agent/referrals" element={<Referrals />} />
        <Route path="/agent/rank" element={<Rank />} />
        <Route path="/agent/customers" element={<Customers />} />
        <Route path="/agent/customers/:id" element={<CustomerDetail />} />
        <Route path="/agent/tickets" element={<Tickets />} />
        <Route path="/agent/tickets/:id" element={<TicketDetail />} />
        <Route path="/agent/team" element={<Team />} />
        <Route path="/agent/projects" element={<Projects />} />
        <Route path="/agent/projects/:id" element={<ProjectDetail />} />
        <Route path="/agent/profile" element={<Profile />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/agents" element={<Agents />} />
        <Route path="/admin/agents/:id" element={<AgentDetail />} />
        <Route path="/admin/kyc" element={<AdminKyc />} />
        <Route path="/admin/kyc/:id" element={<AdminKycDetail />} />
        <Route path="/admin/ranks" element={<Ranks />} />
        <Route path="/admin/referrals" element={<AdminReferrals />} />
        <Route path="/admin/bookings" element={<AdminBookings />} />
        <Route path="/admin/bookings/create" element={<AdminBookingCreate />} />
        <Route path="/admin/bookings/pending" element={<AdminBookingsPending />} />
        <Route path="/admin/bookings/:id" element={<AdminBookingDetail />} />
        <Route path="/admin/emis" element={<EmiManagement />} />
        <Route path="/admin/sub-admins" element={<SubAdmins />} />
        <Route path="/admin/sub-admins/create" element={<SubAdminCreate />} />
        <Route path="/admin/sub-admins/:id/edit" element={<SubAdminEdit />} />
        <Route path="/admin/audit-logs" element={<AuditLogs />} />
        <Route path="/admin/settings" element={<Settings />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
        <Route path="/admin/reports" element={<ReportsOverview />} />
        <Route path="/admin/reports/emi-collections" element={<EmiCollectionsReport />} />
        <Route path="/admin/reports/commissions" element={<CommissionsReport />} />
        <Route path="/admin/reports/agent-earnings" element={<AgentEarningsReport />} />
        <Route path="/admin/reports/project-sales" element={<ProjectSalesReport />} />
        <Route path="/admin/reports/payouts" element={<PayoutsReport />} />
        <Route path="/admin/projects" element={<AdminProjects />} />
        <Route path="/admin/projects/create" element={<ProjectCreate />} />
        <Route path="/admin/projects/:id/edit" element={<ProjectEdit />} />
        <Route path="/admin/projects/:id" element={<ProjectShow />} />
        <Route path="/admin/projects/:projectId/plots" element={<PlotsList />} />
        <Route path="/admin/projects/:projectId/plots/create" element={<PlotCreate />} />
        <Route path="/admin/projects/:projectId/plots/:plotId/edit" element={<PlotEdit />} />
        <Route path="/admin/projects/:projectId/plots/:plotId" element={<PlotShow />} />
        <Route path="/admin/projects/:id/map" element={<ProjectMap />} />
        <Route path="/admin/projects/:id/builder" element={<ProjectBuilder />} />
        <Route path="/admin/withdrawals" element={<Withdrawals />} />
        <Route path="/admin/withdrawals/:id" element={<WithdrawalDetail />} />
        <Route path="/admin/tickets" element={<AdminTickets />} />
        <Route path="/admin/tickets/:id" element={<AdminTicketDetail />} />
        <Route path="/admin/customers" element={<AdminCustomers />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;