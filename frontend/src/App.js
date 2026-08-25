import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "next-themes";
import api from "@/api/client";
import { applyAccentColor } from "@/lib/theme";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import PropertiesList from "@/pages/PropertiesList";
import PropertyDetail from "@/pages/PropertyDetail";
import BuyerHome from "@/pages/BuyerHome";
import SavedProperties from "@/pages/SavedProperties";
import MyEnquiries from "@/pages/MyEnquiries";
import Services from "@/pages/Services";
import Construction from "@/pages/Construction";
import SellerDashboard from "@/pages/SellerDashboard";
import NewListing from "@/pages/NewListing";
import ListingEdit from "@/pages/ListingEdit";
import SellerEnquiries from "@/pages/SellerEnquiries";
import AdminDashboard from "@/pages/AdminDashboard";
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";
import ChatPage from "@/pages/ChatPage";
import ProjectDetail from "@/pages/ProjectDetail";
import ChatBot from "@/components/ChatBot";
import { RequireAuth } from "@/components/RequireAuth";

// CRM Pages
import CrmLogin from "@/pages/crm/CrmLogin";
import CrmLayout from "@/pages/crm/CrmLayout";
import CrmGateway from "@/pages/crm/CrmGateway";
import CrmDashboard from "@/pages/crm/CrmDashboard";
import CrmLeads from "@/pages/crm/CrmLeads";
import CrmLeadDetail from "@/pages/crm/CrmLeadDetail";
import CrmCustomers from "@/pages/crm/CrmCustomers";
import CrmRequirements from "@/pages/crm/CrmRequirements";
import CrmProperties from "@/pages/crm/CrmProperties";
import CrmOwners from "@/pages/crm/CrmOwners";
import CrmBrokers from "@/pages/crm/CrmBrokers";
import CrmTasks from "@/pages/crm/CrmTasks";
import CrmFollowups from "@/pages/crm/CrmFollowups";
import CrmSiteVisits from "@/pages/crm/CrmSiteVisits";
import CrmPropertyShares from "@/pages/crm/CrmPropertyShares";
import CrmNegotiations from "@/pages/crm/CrmNegotiations";
import CrmDeals from "@/pages/crm/CrmDeals";
import CrmDocuments from "@/pages/crm/CrmDocuments";
import CrmPayments from "@/pages/crm/CrmPayments";
import CrmCommissions from "@/pages/crm/CrmCommissions";
import CrmReports from "@/pages/crm/CrmReports";
import CrmEmployees from "@/pages/crm/CrmEmployees";
import CrmAuditLogs from "@/pages/crm/CrmAuditLogs";
import CrmSettings from "@/pages/crm/CrmSettings";
import CrmSearch from "@/pages/crm/CrmSearch";
import RequireCrmGateway from "@/components/RequireCrmGateway";


function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-transition">
      <Routes location={location}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/properties" element={<PropertiesList />} />
        <Route path="/properties/:id" element={<PropertyDetail />} />
        <Route path="/services" element={<Services />} />
        <Route path="/construction" element={<Construction />} />

        {/* Buyer */}
        <Route
          path="/home"
          element={
            <RequireAuth roles={["buyer", "admin"]}>
              <BuyerHome />
            </RequireAuth>
          }
        />
        <Route
          path="/saved"
          element={
            <RequireAuth roles={["buyer", "admin"]}>
              <SavedProperties />
            </RequireAuth>
          }
        />
        <Route
          path="/enquiries"
          element={
            <RequireAuth roles={["buyer", "admin"]}>
              <MyEnquiries />
            </RequireAuth>
          }
        />

        {/* Seller */}
        <Route
          path="/seller/dashboard"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              <SellerDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/seller/listings/new"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              <NewListing />
            </RequireAuth>
          }
        />
        <Route
          path="/seller/listings/:id/edit"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              <ListingEdit />
            </RequireAuth>
          }
        />
        <Route
          path="/seller/enquiries"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              <SellerEnquiries />
            </RequireAuth>
          }
        />

        {/* Admin */}
        <Route
          path="/admin/dashboard"
          element={
            <RequireAuth roles={["admin"]}>
              <AdminDashboard />
            </RequireAuth>
          }
        />
          <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* CRM Gateway — public, no guard needed */}
        <Route path="/crm-access" element={<CrmGateway />} />

        {/* Internal CRM — both routes protected by Layer-1 gateway */}
        <Route
          path="/crm/login"
          element={
            <RequireCrmGateway>
              <CrmLogin />
            </RequireCrmGateway>
          }
        />
        <Route
          path="/crm"
          element={
            <RequireCrmGateway>
              <CrmLayout />
            </RequireCrmGateway>
          }
        >
          <Route index element={<Navigate to="/crm/dashboard" replace />} />
          <Route path="dashboard" element={<CrmDashboard />} />
          <Route path="leads" element={<CrmLeads />} />
          <Route path="leads/:id" element={<CrmLeadDetail />} />
          <Route path="customers" element={<CrmCustomers />} />
          <Route path="requirements" element={<CrmRequirements />} />
          <Route path="properties" element={<CrmProperties />} />
          <Route path="owners" element={<CrmOwners />} />
          <Route path="brokers" element={<CrmBrokers />} />
          <Route path="tasks" element={<CrmTasks />} />
          <Route path="followups" element={<CrmFollowups />} />
          <Route path="site-visits" element={<CrmSiteVisits />} />
          <Route path="property-shares" element={<CrmPropertyShares />} />
          <Route path="negotiations" element={<CrmNegotiations />} />
          <Route path="deals" element={<CrmDeals />} />
          <Route path="documents" element={<CrmDocuments />} />
          <Route path="payments" element={<CrmPayments />} />
          <Route path="commissions" element={<CrmCommissions />} />
          <Route path="reports" element={<CrmReports />} />
          <Route path="employees" element={<CrmEmployees />} />
          <Route path="audit-logs" element={<CrmAuditLogs />} />
          <Route path="settings" element={<CrmSettings />} />
          <Route path="search" element={<CrmSearch />} />
        </Route>


        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function App() {
  useEffect(() => {
    api
      .get("/hero")
      .then(({ data }) => {
        if (data?.accent_color) applyAccentColor(data.accent_color);
      })
      .catch(() => {});
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <div className="App">
        <BrowserRouter>
          <AnimatedRoutes />

          {/* Floating chatbot bubble — visible on all pages except /chat */}
          <ChatBot />
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#171717",
              color: "#fff",
              borderRadius: 8,
              fontSize: "0.9rem",
            },
          }}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
