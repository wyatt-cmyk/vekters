// A warning message. A hard left bar rather than a soft tinted box, so it reads
// as a note in the margin instead of a floating card.
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-warn-line border-l-4 border-l-warn bg-warn-fill px-4 py-3 text-warn">{children}</div>
  );
}
