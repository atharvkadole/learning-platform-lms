import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { branding } from "../config/branding.js";
import { AuthProvider } from "../lib/auth.jsx";
import { queryClient } from "../lib/queryClient.js";
import { ThemeProvider } from "../lib/theme.jsx";
import { LiveUpdates } from "./LiveUpdates.jsx";

export function AppProviders({ children }) {
  useEffect(() => {
    document.title = branding.seo.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", branding.seo.description);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <LiveUpdates />
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
