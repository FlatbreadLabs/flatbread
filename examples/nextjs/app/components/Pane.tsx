/**
 * Pane component similar to SvelteKit example
 */

interface PaneProps {
  label: string;
  children: React.ReactNode;
}

export default function Pane({ label, children }: PaneProps) {
  return (
    <div className="flex flex-col">
      <h2 className="bg-black text-white px-4 py-2 font-semibold text-sm uppercase tracking-wide">
        {label}
      </h2>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}