import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { SettingsProvider } from "@/context/SettingsContext";
import { ConversationProvider } from "@/context/ConversationContext";
// import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => {
  // Add link to manifest.json for PWA
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    document.head.appendChild(link);
    
    // Add theme color meta tag for PWA
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#8b5cf6'; // Primary purple color
    document.head.appendChild(meta);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                // <ErrorBoundary>
                  <SettingsProvider>
                    <ConversationProvider>
                      <Index />
                    </ConversationProvider>
                  </SettingsProvider>
                // </ErrorBoundary>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
