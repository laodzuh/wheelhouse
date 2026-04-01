import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { seedDatabase } from "./db/seed";
import "./index.css";

// Expose seed function for dev use: open browser console, type seedDatabase()
(window as unknown as Record<string, unknown>).seedDatabase = seedDatabase;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
