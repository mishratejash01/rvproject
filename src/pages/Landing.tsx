import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Rocket, Target, Gauge, GitBranch, Presentation, Landmark, Banknote, Flame } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useInvestors, useBenchmarks, useGrants, useCampuses } from "@/hooks/useReference";
import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun } from "lucide-react";

const MODULES = [
  {
    icon: Target,
    title: "Idea validation",
    body: "Scored against a six-criterion rubric for pain severity, urgency, feasibility and defensibility — with bottom-up TAM, SAM and SOM you can defend.",
  },
  {
    icon: Gauge,
    title: "Investibility verdict",
    body: "The four filters a seed fund actually applies: founder-market fit, scalability, gross margins and barrier to entry. Verdict either way, with reasons.",
  },
  {
    icon: GitBranch,
    title: "Pivot matrix",
    body: "When an idea fails, three concrete strategic pivots keyed to the exact weaknesses found — adopt one and re-score in a click.",
  },
  {
    icon: Presentation,
    title: "Pitch deck",
    body: "Ten slides in YC and Sequoia order, built from your own validation numbers. Export to markdown or present in full screen.",
  },
  {
    icon: Landmark,
    title: "Investor matching",
    body: "Ranked against real Indian early-stage funds by sector, stage and cheque size — then personalised cold email and LinkedIn drafts.",
  },
  {
    icon: Banknote,
    title: "Grant radar",
    body: "Non-dilutive money you can actually get as a student: NIDHI-PRAYAS, Startup India Seed Fund, Karnataka ELEVATE and more.",
  },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="num text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-[0.8125rem] text-ink-mute">{label}</p>
    </div>
  );
}

export default function Landing() {
  const { data: investors } = useInvestors();
  const { data: benchmarks } = useBenchmarks();
  const { data: grants } = useGrants();
  const { data: campuses } = useCampuses();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-accent" />
            <span className="font-display text-[0.9375rem] font-semibold tracking-tight">LaunchPad RV</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link to="/leaderboard">
              <Button variant="ghost" size="sm">Leaderboard</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Sign in</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <p className="text-[0.8125rem] font-medium tracking-wide text-ink-mute uppercase">
            For RV Institutions · Bengaluru
          </p>
          <h1 className="mt-4 font-display text-[2.75rem] leading-[1.08] font-semibold tracking-tight text-ink sm:text-6xl">
            Turn your academic project into a fundable venture.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-mute">
            LaunchPad is a venture workbench, not a chatbot. It stress-tests your idea against the criteria
            real seed funds apply, tells you honestly whether it is investible, rebuilds it when it is not,
            and hands you the deck, the investor list and the grant applications to act on.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/auth">
              <Button size="lg">
                Validate an idea
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button size="lg" variant="outline">
                See what the campus is building
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mt-20 grid grid-cols-2 gap-8 border-t border-line pt-8 sm:grid-cols-4"
        >
          <Stat value={investors ? `${investors.length}` : "—"} label="Indian funds and angel networks" />
          <Stat value={benchmarks ? `${benchmarks.length}` : "—"} label="Startup benchmarks, sourced and dated" />
          <Stat value={grants ? `${grants.length}` : "—"} label="Non-dilutive grant programmes" />
          <Stat value={campuses ? `${campuses.length}` : "—"} label="RV campuses supported" />
        </motion.div>
      </section>

      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight">The workbench</h2>
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-mute">
            Six modules that run in sequence. Each one feeds the next, so your deck quotes the same market
            numbers your validation produced.
          </p>

          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.05, duration: 0.45 }}
                className="bg-bg p-6"
              >
                <Icon className="h-4 w-4 text-accent" />
                <h3 className="mt-4 font-display text-[0.9375rem] font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-mute">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-bad" />
              <h2 className="font-display text-2xl font-semibold tracking-tight">Roast mode</h2>
            </div>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-mute">
              Flip one switch and the mentor becomes a Tier-1 partner with no patience for vanity metrics.
              It names the deal-breakers, calls out wrapper products pretending to be platforms, and asks the
              question you were hoping nobody would ask. Then defend yourself live against a three-partner
              investment committee that follows up on every weak answer.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Benchmarked against India</h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-mute">
              Your project is mapped to real Indian companies at their earliest stage — Agnikul and Ather out
              of IIT Madras, Pixxel out of BITS Pilani, Sarvam out of an academic AI lab — with the honest
              parallel, where the comparison breaks, and the one tactic worth copying.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-8">
          <p className="text-[0.8125rem] text-ink-faint">
            Built for the students of RV Institutions, Bengaluru.
          </p>
          <Link to="/auth" className="ml-auto">
            <Button variant="outline" size="sm">
              Start now
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </footer>
    </div>
  );
}
