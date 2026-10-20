// A warning message.
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-warn-line bg-warn-fill px-4 py-3 text-warn">{children}</div>
  );
}
