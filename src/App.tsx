import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { JargonProvider } from "@/components/Jargon";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/Card";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import NewProject from "@/pages/NewProject";
import Workbench from "@/pages/Workbench";
import PitchBook from "@/pages/PitchBook";
import Leaderboard from "@/pages/Leaderboard";
import Glossary from "@/pages/Glossary";
import Investors from "@/pages/Investors";
import PublicPitch from "@/pages/PublicPitch";
import CommandCenter from "@/pages/CommandCenter";

/** Wraps authenticated surfaces in the app shell, redirecting signed-out users. */
function Private({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-10">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-4 h-64" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <AppShell>{children}</AppShell>;
}

/** Public surfaces that still benefit from the shell when signed in. */
function Open({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <AppShell>{children}</AppShell> : <div className="mx-auto max-w-7xl px-5 py-10">{children}</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <JargonProvider>
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
      </JargonProvider>
    </AuthProvider>
  );
}
