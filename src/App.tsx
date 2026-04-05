import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Clients from "./pages/Clients.tsx";
import NewClient from "./pages/NewClient.tsx";
import ClientDetail from "./pages/ClientDetail.tsx";
import NewActivation from "./pages/NewActivation.tsx";
import ActivationHub from "./pages/ActivationHub.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/clients/new" element={<ProtectedRoute><NewClient /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
            <Route path="/clients/:id/activations/new" element={<ProtectedRoute><NewActivation /></ProtectedRoute>} />
            <Route path="/activations/:id" element={<ProtectedRoute><ActivationHub /></ProtectedRoute>} />
            <Route path="/activations/:id/*" element={<ProtectedRoute><ActivationHub /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
