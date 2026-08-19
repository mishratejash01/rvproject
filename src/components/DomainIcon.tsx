import { BrainCircuit, Atom, LayoutGrid, Landmark, Cpu, Users, Circle } from "lucide-react";

/**
 * Maps the kebab-case icon name stored on each domain row to a component.
 * Only the icons the product actually uses are bundled — importing the whole
 * icon set costs ~600 kB, which is why this map exists instead of a namespace
 * import. Unknown names fall back gracefully, so adding a domain never breaks
 * the UI even before its icon is mapped here.
 */
const ICONS: Record<string, typeof Circle> = {
  "brain-circuit": BrainCircuit,
  atom: Atom,
  "layout-grid": LayoutGrid,
  landmark: Landmark,
  cpu: Cpu,
  users: Users,
};

export function DomainIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Circle;
  return <Icon className={className} />;
}
