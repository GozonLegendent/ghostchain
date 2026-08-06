import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Overview from "./pages/Overview";
import LiveIncidents from "./pages/LiveIncidents";
import ThreatCampaigns from "./pages/ThreatCampaigns";
import EvidenceVault from "./pages/EvidenceVault";
import AuditPortal from "./pages/AuditPortal";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<Overview />} />
          <Route path="/incidents" element={<LiveIncidents />} />
          <Route path="/campaigns" element={<ThreatCampaigns />} />
          <Route path="/evidence" element={<EvidenceVault />} />
          <Route path="/audit" element={<AuditPortal />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);