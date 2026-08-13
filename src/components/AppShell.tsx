import { Link, NavLink, useNavigate } from "react-router-dom";
import { Moon, Sun, LogOut, Rocket, LayoutGrid, Trophy, BookOpen, Landmark, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Workspace", icon: LayoutGrid },
  { to: "/investors", label: "Investors", icon: Landmark },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/glossary", label: "Glossary", icon: BookOpen },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, isGuest, isAdmin, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-5">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-accent" />
            <span className="font-display text-[0.9375rem] font-semibold tracking-tight">LaunchPad RV</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.8125rem] transition-colors",
                    isActive ? "bg-overlay text-ink" : "text-ink-mute hover:text-ink",
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/command-center"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.8125rem] transition-colors",
                    isActive ? "bg-overlay text-ink" : "text-ink-mute hover:text-ink",
                  )
                }
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Command Center
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {isGuest && <Badge tone="warn">Guest session</Badge>}
            {profile?.full_name && !isGuest && (
              <span className="hidden text-[0.8125rem] text-ink-mute sm:inline">{profile.full_name}</span>
            )}
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-line px-4 py-1.5 md:hidden">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.8125rem]",
                  isActive ? "bg-overlay text-ink" : "text-ink-mute",
                )
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
