import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useUserProfile } from "@/db";
import { initSync } from "@/db/sync";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { Strategy } from "@/pages/Strategy";
import { NewThesis } from "@/pages/NewThesis";
import { ThesisView } from "@/pages/ThesisView";
import { TradeEntry } from "@/pages/TradeEntry";
import { PlanTrade } from "@/pages/PlanTrade";
import { BottomNav } from "@/components/BottomNav";

export function App() {
  useEffect(() => {
    void initSync();
  }, []);

  const profile = useUserProfile();

  if (profile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-wh-text-muted">Loading...</div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/strategy" element={<Strategy />} />
        <Route path="/thesis/:tickerId" element={<ThesisView />} />
        <Route path="/thesis/:tickerId/plan" element={<PlanTrade />} />
        <Route path="/thesis/:tickerId/trade/start" element={<TradeEntry />} />
        <Route path="/thesis/:tickerId/trade" element={<TradeEntry />} />
        <Route path="/thesis/new" element={<NewThesis />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}
