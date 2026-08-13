import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Rocket } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Field";

export default function Auth() {
  const { user, loading, signInWithOtp, verifyOtp, signInWithGoogle, continueAsGuest } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState<string | null>(null);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  async function run(key: string, fn: () => Promise<void>, success?: string) {
    setBusy(key);
    try {
      await fn();
      if (success) toast.success(success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5">
          <Link to="/" className="flex items-center gap-2 text-ink-mute transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[0.8125rem]">Back</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-accent" />
            <span className="font-display text-[0.9375rem] font-semibold tracking-tight">LaunchPad RV</span>
          </div>
          <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
            {stage === "email" ? "Sign in to your workbench" : "Enter your code"}
          </h1>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-mute">
            {stage === "email"
              ? "Your projects, scores and decks stay private to your account."
              : `We sent a six-digit code to ${email}.`}
          </p>

          {stage === "email" ? (
            <form
              className="mt-8 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.trim()) return;
                run("otp", async () => {
                  await signInWithOtp(email.trim());
                  setStage("code");
                }, "Code sent — check your inbox.");
              }}
            >
              <Field label="Email address" required>
                <Input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="you@rvce.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Button type="submit" className="w-full" loading={busy === "otp"}>
                Continue with email
              </Button>
            </form>
          ) : (
            <form
              className="mt-8 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                run("verify", () => verifyOtp(email.trim(), code.trim()));
              }}
            >
              <Field label="Six-digit code" required>
                <Input
                  required
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="num tracking-[0.3em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
              <Button type="submit" className="w-full" loading={busy === "verify"}>
                Verify and continue
              </Button>
              <button
                type="button"
                className="w-full text-[0.75rem] text-ink-faint transition-colors hover:text-ink-mute"
                onClick={() => setStage("email")}
              >
                Use a different email
              </button>
            </form>
          )}

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[0.6875rem] tracking-wide text-ink-faint uppercase">or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <div className="space-y-2.5">
            <Button
              variant="outline"
              className="w-full"
              loading={busy === "google"}
              onClick={() => run("google", signInWithGoogle)}
            >
              <GoogleMark />
              Continue with Google
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              loading={busy === "guest"}
              onClick={() => run("guest", continueAsGuest)}
            >
              Explore as a guest
            </Button>
          </div>

          <p className="mt-6 text-[0.75rem] leading-relaxed text-ink-faint">
            Guest sessions are fully functional — your work is saved and stays private to that session.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z" />
    </svg>
  );
}
