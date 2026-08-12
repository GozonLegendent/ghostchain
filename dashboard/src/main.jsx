import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import App from "./App";
import Login from "./pages/Login";
import PersonalAudit from "./pages/PersonalAudit";
import Overview from "./pages/Overview";
import LiveIncidents from "./pages/LiveIncidents";
import ThreatCampaigns from "./pages/ThreatCampaigns";
import EvidenceVault from "./pages/EvidenceVault";
import AuditPortal from "./pages/AuditPortal";
import NetworkAnalysis from "./pages/NetworkAnalysis";
import "./index.css";
import SanitizedReports from "./pages/SanitizedReports";
import ErrorBoundary from "./components/ErrorBoundary";

function ProtectedRoute({ children }) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route path="audit-my-data" element={<PersonalAudit />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="incidents" element={<LiveIncidents />} />
              <Route path="campaigns" element={<ThreatCampaigns />} />
              <Route path="reports" element={<SanitizedReports />} />
              <Route path="evidence" element={<EvidenceVault />} />
              <Route path="audit" element={<AuditPortal />} />
              <Route path="analysis" element={<NetworkAnalysis />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);