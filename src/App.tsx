import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Clients = lazy(() => import("./pages/Clients"));
const NewClient = lazy(() => import("./pages/NewClient"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const NewActivation = lazy(() => import("./pages/NewActivation"));
const ActivationHub = lazy(() => import("./pages/ActivationHub"));
const NewAsset = lazy(() => import("./pages/NewAsset"));
const AssetDetail = lazy(() => import("./pages/AssetDetail"));
const CopyDetail = lazy(() => import("./pages/CopyDetail"));
const Notifications = lazy(() => import("./pages/Notifications"));
const SettingsTeam = lazy(() => import("./pages/SettingsTeam"));
const SettingsFormats = lazy(() => import("./pages/SettingsFormats"));
const SettingsTemplates = lazy(() => import("./pages/SettingsTemplates"));
const SettingsPrompts = lazy(() => import("./pages/SettingsPrompts"));
const BatchAssets = lazy(() => import("./pages/BatchAssets"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center" style={{ background: "hsl(var(--bg-base))" }}>
    <div className="space-y-4 w-64">
      <Skeleton className="h-6 w-48 bg-surface-3 mx-auto" />
      <Skeleton className="h-3 w-32 bg-surface-3 mx-auto" />
    </div>
  </div>
);

const P = ({ children }: { children: React.ReactNode }) => <ProtectedRoute>{children}</ProtectedRoute>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <GlobalSearch />
          <Suspense fallback={<PageLoader />}>
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
              <Route path="/settings/prompts" element={<P><SettingsPrompts /></P>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
