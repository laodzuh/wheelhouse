import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/wheels", label: "Wheels" },
  { to: "/covered-calls", label: "Covered Calls" },
  { to: "/csps", label: "Cash-Secured Puts" },
  { to: "/trades", label: "Trade Log" },
  { to: "/settings", label: "Settings" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-950 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="font-bold text-gray-100">Wheelhouse</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-1 text-gray-400 cursor-pointer">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <div className="border-b border-gray-800 bg-gray-950 px-4 py-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium",
                  isActive ? "text-blue-400" : "text-gray-400"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
