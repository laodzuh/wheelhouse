import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { App } from "./App";
import { DashboardPage } from "./pages/DashboardPage";
import { WheelsPage } from "./pages/WheelsPage";
import { CoveredCallsPage } from "./pages/CoveredCallsPage";
import { CSPPage } from "./pages/CSPPage";
import { TradesPage } from "./pages/TradesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<DashboardPage />} />
            <Route path="wheels" element={<WheelsPage />} />
            <Route path="covered-calls" element={<CoveredCallsPage />} />
            <Route path="csps" element={<CSPPage />} />
            <Route path="trades" element={<TradesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>
);
