import { Routes, Route } from "react-router-dom";

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="font-display text-2xl font-semibold tracking-tight">LaunchPad RV</p>
        <p className="mt-2 text-sm text-ink-mute">{label} — under construction</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<ComingSoon label="Venture Workbench" />} />
    </Routes>
  );
}
