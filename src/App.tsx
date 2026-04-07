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
import NewAsset from "./pages/NewAsset.tsx";
import AssetDetail from "./pages/AssetDetail.tsx";
import CopyDetail from "./pages/CopyDetail.tsx";
import Notifications from "./pages/Notifications.tsx";
import SettingsTeam from "./pages/SettingsTeam.tsx";
import SettingsFormats from "./pages/SettingsFormats.tsx";
import SettingsTemplates from "./pages/SettingsTemplates.tsx";
import BatchAssets from "./pages/BatchAssets.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => <ProtectedRoute>{children}</ProtectedRoute>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<P><Index /></P>} />
            <Route path="/clients" element={<P><Clients /></P>} />
            <Route path="/clients/new" element={<P><NewClient /></P>} />
            <Route path="/clients/:id" element={<P><ClientDetail /></P>} />
            <Route path="/clients/:id/activations/new" element={<P><NewActivation /></P>} />
            <Route path="/activations/:id" element={<P><ActivationHub /></P>} />
            <Route path="/activations/:id/brief" element={<P><ActivationHub /></P>} />
            <Route path="/activations/:id/copies" element={<P><ActivationHub /></P>} />
            <Route path="/activations/:id/copies/:copyId" element={<P><CopyDetail /></P>} />
            <Route path="/activations/:id/assets" element={<P><ActivationHub /></P>} />
            <Route path="/activations/:id/assets/new" element={<P><NewAsset /></P>} />
            <Route path="/activations/:id/assets/batch" element={<P><BatchAssets /></P>} />
            <Route path="/activations/:id/assets/:assetId" element={<P><AssetDetail /></P>} />
            <Route path="/activations/:id/ad-campaigns" element={<P><ActivationHub /></P>} />
            <Route path="/activations/:id/utm" element={<P><ActivationHub /></P>} />
            <Route path="/activations/:id/schedule" element={<P><ActivationHub /></P>} />
            <Route path="/activations/:id/analytics" element={<P><ActivationHub /></P>} />
            <Route path="/notifications" element={<P><Notifications /></P>} />
            <Route path="/settings/team" element={<P><SettingsTeam /></P>} />
            <Route path="/settings/templates" element={<P><SettingsTemplates /></P>} />
            <Route path="/settings/formats" element={<P><SettingsFormats /></P>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
