// Height-animated fold (grid 0fr → 1fr, so no measuring and no layout thrash).
// Folded content is inert: not focusable, not read out, not clickable.
export default function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className="fold" data-open={open}>
      <div className="fold-inner" inert={!open}>
        {children}
      </div>
    </div>
  );
}
