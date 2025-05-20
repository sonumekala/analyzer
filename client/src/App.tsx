import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Welcome from "@/pages/welcome";
import Dashboard from "@/pages/dashboard";
import Settings from "@/pages/settings";

// Import CSS for Scrollbars
import { useEffect } from "react";

function Router() {
  // Add CSS for custom scrollbars
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-thin::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .scrollbar-thin::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb {
        background-color: #c1c1c1;
        border-radius: 3px;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background: #a1a1a1;
      }
      .progress-bar {
        height: 8px;
        border-radius: 4px;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
