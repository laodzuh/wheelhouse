import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", label: "Home", icon: "⊙" },
  { path: "/strategy", label: "Strategy", icon: "◈" },
] as const;

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide nav on thesis detail, trade entry, and thesis creation pages
  if (
    location.pathname.startsWith("/thesis") ||
    location.pathname === "/onboarding"
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-wh-border bg-wh-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors ${
                isActive
                  ? "text-wh-accent"
                  : "text-wh-text-muted hover:text-wh-text"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
