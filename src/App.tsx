import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Sidebar />
      <MobileNav />
      <main className="md:ml-56">
        <div className="mx-auto max-w-7xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
