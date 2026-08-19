import { Suspense, lazy, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { JargonProvider } from "@/components/Jargon";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/Card";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";

/**
 * Everything past the entry points is code-split: charts, the deck editor and
 * the war room never reach a visitor who only opens the landing page. Chunks
 * prefetch on hover via the router, so navigation still feels instant.
 */
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const NewProject = lazy(() => import("@/pages/NewProject"));
const Workbench = lazy(() => import("@/pages/Workbench"));
const PitchBook = lazy(() => import("@/pages/PitchBook"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Glossary = lazy(() => import("@/pages/Glossary"));
const Investors = lazy(() => import("@/pages/Investors"));
const PublicPitch = lazy(() => import("@/pages/PublicPitch"));
const CommandCenter = lazy(() => import("@/pages/CommandCenter"));

function PageFallback() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-4 h-64" />
    </div>
  );
}

/** Authenticated surfaces, wrapped in the app shell. */
function Private({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  return <AppShell>{children}</AppShell>;
}

/** Public surfaces that still get the shell when signed in. */
function Open({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageFallback />;
  return user ? <AppShell>{children}</AppShell> : <div className="mx-auto max-w-7xl px-5 py-10">{children}</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <JargonProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/p/:slug" element={<PublicPitch />} />

            <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
            <Route path="/new" element={<Private><NewProject /></Private>} />
            <Route path="/project/:id" element={<Private><Workbench /></Private>} />
            <Route path="/project/:id/pitchbook" element={<Private><PitchBook /></Private>} />
            <Route path="/command-center" element={<Private><CommandCenter /></Private>} />

            <Route path="/leaderboard" element={<Open><Leaderboard /></Open>} />
            <Route path="/glossary" element={<Open><Glossary /></Open>} />
            <Route path="/investors" element={<Open><Investors /></Open>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </JargonProvider>
    </AuthProvider>
  );
}
