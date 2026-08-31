import { Routes, Route, Navigate } from "react-router-dom";
import AgentLayout from "./layouts/AgentLayout.jsx";
import Dashboard from "./pages/agent/Dashboard.jsx";
import Kyc from "./pages/agent/Kyc.jsx";
import Bookings from "./pages/agent/Bookings.jsx";
import AgentSiteVisits from "./pages/agent/SiteVisits.jsx";
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
import ProjectMapView from "./pages/agent/ProjectMapView.jsx";
import Profile from "./pages/agent/Profile.jsx";
import Login from "./pages/auth/Login.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import Register from "./pages/auth/Register.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import PermissionRoute from "./components/auth/PermissionRoute.jsx";
import AdminDashboard from "./pages/admin/Dashboard.jsx";
import Agents from "./pages/admin/Agents.jsx";
import AgentDetail from "./pages/admin/AgentDetail.jsx";
import AgentCreate from "./pages/admin/AgentCreate.jsx";
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
import AdminSiteVisits from "./pages/admin/SiteVisits.jsx";
import AdminInstallmentDues from "./pages/admin/InstallmentDues.jsx";
import AdminInstallmentSchedules from "./pages/admin/InstallmentSchedules.jsx";
import AdminBookingDetail from "./pages/admin/BookingDetail.jsx";
import AdminBookingCreate from "./pages/admin/BookingCreate.jsx";
import AdminBookingsPending from "./pages/admin/BookingsPending.jsx";
import AdminEmiEditRequests from "./pages/admin/EmiEditRequests.jsx";
import EmiManagement from "./pages/admin/EmiManagement.jsx";
import SubAdmins from "./pages/admin/SubAdmins.jsx";
import SubAdminCreate from "./pages/admin/SubAdminCreate.jsx";
import SubAdminEdit from "./pages/admin/SubAdminEdit.jsx";
import AuditLogs from "./pages/admin/AuditLogs.jsx";
import Settings from "./pages/admin/Settings.jsx";
import BankManagement from "./pages/admin/BankManagement.jsx";
import PricingRules from "./pages/admin/PricingRules.jsx";
import AccountLedger from "./pages/admin/AccountLedger.jsx";
import FinanceTds from "./pages/admin/FinanceTds.jsx";
import AdminProfile from "./pages/admin/Profile.jsx";
import NoAccess from "./pages/admin/NoAccess.jsx";
import Leads from "./pages/admin/Leads.jsx";
import ReportsOverview from "./pages/admin/ReportsOverview.jsx";
import EmiCollectionsReport from "./pages/admin/EmiCollectionsReport.jsx";
import CommissionPending from "./pages/admin/CommissionPending.jsx";
import CommissionsReport from "./pages/admin/CommissionsReport.jsx";
import AgentEarningsReport from "./pages/admin/AgentEarningsReport.jsx";
import ProjectSalesReport from "./pages/admin/ProjectSalesReport.jsx";
import PayoutsReport from "./pages/admin/PayoutsReport.jsx";
import DateRangeReport from "./pages/admin/DateRangeReport.jsx";
import BookedPlotsReport from "./pages/admin/BookedPlotsReport.jsx";
import ExecutiveCommissionReport from "./pages/admin/ExecutiveCommissionReport.jsx";
import MonthEndReport from "./pages/admin/MonthEndReport.jsx";
import SingleUnitReport from "./pages/admin/SingleUnitReport.jsx";
import CancelledBookingsReport from "./pages/admin/CancelledBookingsReport.jsx";
import ExecutiveTdsReport from "./pages/admin/ExecutiveTdsReport.jsx";
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
import PlotMapper from "./pages/admin/PlotMapper.jsx";
import FullTree from "./pages/admin/FullTree.jsx";

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
        <Route path="/agent/site-visits" element={<AgentSiteVisits />} />
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
        <Route path="/agent/projects/:id/map" element={<ProjectMapView />} />        <Route path="/agent/profile" element={<Profile />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/no-access" element={<NoAccess />} />
        <Route path="/admin/dashboard" element={<PermissionRoute permission="dashboard"><AdminDashboard /></PermissionRoute>} />

        <Route path="/admin/agents" element={<PermissionRoute permission="agents"><Agents /></PermissionRoute>} />
        <Route path="/admin/agents/create" element={<PermissionRoute permission="agents"><AgentCreate /></PermissionRoute>} />
        <Route path="/admin/agents/:id" element={<PermissionRoute permission="agents"><AgentDetail /></PermissionRoute>} />

        <Route path="/admin/kyc" element={<PermissionRoute permission="kyc"><AdminKyc /></PermissionRoute>} />
        <Route path="/admin/kyc/:id" element={<PermissionRoute permission="kyc"><AdminKycDetail /></PermissionRoute>} />

        <Route path="/admin/ranks" element={<PermissionRoute superAdminOnly><Ranks /></PermissionRoute>} />
        <Route path="/admin/full-tree" element={<PermissionRoute superAdminOnly><FullTree /></PermissionRoute>} />
        <Route path="/admin/referrals" element={<PermissionRoute permission="referrals"><AdminReferrals /></PermissionRoute>} />

        <Route path="/admin/bookings" element={<PermissionRoute permission="bookings"><AdminBookings /></PermissionRoute>} />
        <Route path="/admin/site-visits" element={<PermissionRoute permission="site_visits"><AdminSiteVisits /></PermissionRoute>} />
        <Route path="/admin/installment-dues" element={<PermissionRoute permission="installment_dues"><AdminInstallmentDues /></PermissionRoute>} />
        <Route path="/admin/installment-schedules" element={<PermissionRoute permission="installment_schedules"><AdminInstallmentSchedules /></PermissionRoute>} />
        <Route path="/admin/bookings/create" element={<PermissionRoute permission="bookings"><AdminBookingCreate /></PermissionRoute>} />
        <Route path="/admin/bookings/pending" element={<PermissionRoute permission="bookings"><AdminBookingsPending /></PermissionRoute>} />
        <Route path="/admin/emi-edit-requests" element={<PermissionRoute permission="bookings"><AdminEmiEditRequests /></PermissionRoute>} />
        <Route path="/admin/bookings/:id" element={<PermissionRoute permission="bookings"><AdminBookingDetail /></PermissionRoute>} />

        <Route path="/admin/emis" element={<PermissionRoute permission="emis"><EmiManagement /></PermissionRoute>} />

        <Route path="/admin/sub-admins" element={<PermissionRoute superAdminOnly><SubAdmins /></PermissionRoute>} />
        <Route path="/admin/sub-admins/create" element={<PermissionRoute superAdminOnly><SubAdminCreate /></PermissionRoute>} />
        <Route path="/admin/sub-admins/:id/edit" element={<PermissionRoute superAdminOnly><SubAdminEdit /></PermissionRoute>} />
        <Route path="/admin/audit-logs" element={<PermissionRoute superAdminOnly><AuditLogs /></PermissionRoute>} />
        <Route path="/admin/settings" element={<PermissionRoute superAdminOnly><Settings /></PermissionRoute>} />
        <Route path="/admin/banks" element={<PermissionRoute superAdminOnly><BankManagement /></PermissionRoute>} />
        <Route path="/admin/pricing-rules" element={<PermissionRoute superAdminOnly><PricingRules /></PermissionRoute>} />
        <Route path="/admin/account-ledger" element={<PermissionRoute superAdminOnly><AccountLedger /></PermissionRoute>} />
        <Route path="/admin/finance-tds" element={<PermissionRoute superAdminOnly><FinanceTds /></PermissionRoute>} />
        <Route path="/admin/profile" element={<AdminProfile />} />

        <Route path="/admin/reports" element={<PermissionRoute permission="reports"><ReportsOverview /></PermissionRoute>} />
        <Route path="/admin/reports/emi-collections" element={<PermissionRoute permission="reports_emi"><EmiCollectionsReport /></PermissionRoute>} />
        <Route path="/admin/reports/commission-pending" element={<PermissionRoute permission="reports_emi"><CommissionPending /></PermissionRoute>} />
        <Route path="/admin/reports/commissions" element={<PermissionRoute permission="reports_commissions"><CommissionsReport /></PermissionRoute>} />
        <Route path="/admin/reports/agent-earnings" element={<PermissionRoute permission="reports_agent_earnings"><AgentEarningsReport /></PermissionRoute>} />
        <Route path="/admin/reports/project-sales" element={<PermissionRoute permission="reports_project_sales"><ProjectSalesReport /></PermissionRoute>} />
        <Route path="/admin/reports/payouts" element={<PermissionRoute permission="reports_payouts"><PayoutsReport /></PermissionRoute>} />
        <Route path="/admin/reports/date-range" element={<PermissionRoute permission="reports_date_range"><DateRangeReport /></PermissionRoute>} />
        <Route path="/admin/reports/booked-plots" element={<PermissionRoute permission="reports_booked_plots"><BookedPlotsReport /></PermissionRoute>} />
        <Route path="/admin/reports/executive-commissions" element={<PermissionRoute permission="reports_executive_commissions"><ExecutiveCommissionReport /></PermissionRoute>} />
        <Route path="/admin/reports/month-end" element={<PermissionRoute permission="reports_month_end"><MonthEndReport /></PermissionRoute>} />
        <Route path="/admin/reports/single-unit" element={<PermissionRoute permission="reports_single_unit"><SingleUnitReport /></PermissionRoute>} />
        <Route path="/admin/reports/cancelled-bookings" element={<PermissionRoute permission="reports_cancelled_bookings"><CancelledBookingsReport /></PermissionRoute>} />
        <Route path="/admin/reports/executive-tds" element={<PermissionRoute permission="reports_executive_tds"><ExecutiveTdsReport /></PermissionRoute>} />

        <Route path="/admin/projects" element={<PermissionRoute permission="projects"><AdminProjects /></PermissionRoute>} />
        <Route path="/admin/projects/create" element={<PermissionRoute permission="projects"><ProjectCreate /></PermissionRoute>} />
        <Route path="/admin/projects/:id/edit" element={<PermissionRoute permission="projects"><ProjectEdit /></PermissionRoute>} />
        <Route path="/admin/projects/:id" element={<PermissionRoute permission="projects"><ProjectShow /></PermissionRoute>} />
        <Route path="/admin/projects/:projectId/plots" element={<PermissionRoute permission="projects"><PlotsList /></PermissionRoute>} />
        <Route path="/admin/projects/:projectId/plots/create" element={<PermissionRoute permission="projects"><PlotCreate /></PermissionRoute>} />
        <Route path="/admin/projects/:projectId/plots/:plotId/edit" element={<PermissionRoute permission="projects"><PlotEdit /></PermissionRoute>} />
        <Route path="/admin/projects/:projectId/plots/:plotId" element={<PermissionRoute permission="projects"><PlotShow /></PermissionRoute>} />
        <Route path="/admin/projects/:id/map" element={<PermissionRoute permission="projects"><ProjectMap /></PermissionRoute>} />
        <Route path="/admin/projects/:id/builder" element={<PermissionRoute permission="projects"><ProjectBuilder /></PermissionRoute>} />
        <Route path="/admin/projects/:id/plot-mapper" element={<PermissionRoute permission="projects"><PlotMapper /></PermissionRoute>} />

        <Route path="/admin/withdrawals" element={<PermissionRoute permission="withdrawals"><Withdrawals /></PermissionRoute>} />
        <Route path="/admin/withdrawals/:id" element={<PermissionRoute permission="withdrawals"><WithdrawalDetail /></PermissionRoute>} />

        <Route path="/admin/tickets" element={<PermissionRoute permission="tickets"><AdminTickets /></PermissionRoute>} />
        <Route path="/admin/tickets/:id" element={<PermissionRoute permission="tickets"><AdminTicketDetail /></PermissionRoute>} />

        <Route path="/admin/customers" element={<PermissionRoute permission="customers"><AdminCustomers /></PermissionRoute>} />
        <Route path="/admin/leads" element={<PermissionRoute permission="leads"><Leads /></PermissionRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
