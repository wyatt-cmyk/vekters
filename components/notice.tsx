// A small warning-colored message box.
export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-warn-line bg-warn-fill px-4 py-3 text-warn">{children}</div>;
}
