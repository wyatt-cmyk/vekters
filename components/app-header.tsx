// Top bar shared by every page: the wordmark, a link to the other page, and
// either Sign out (real Google data) or a Demo marker.
import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/auth";

type Props = {
  mode: "demo" | "google";
  userName?: string | null;
  link: { href: string; label: string };
};

export function AppHeader({ mode, userName, link }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-line bg-surface px-6 py-3">
      <Link href="/" className="font-display text-xl font-semibold tracking-tight">
        Athlete Calendar
      </Link>

      <div className="ml-auto flex items-center gap-3">
        {userName && <span className="hidden text-sm text-muted sm:inline">{userName}</span>}
        <Link
          href={link.href}
          className="flex min-h-10 items-center rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-bg"
        >
          {link.label}
        </Link>
        {mode === "demo" ? (
          <span className="rounded-full bg-warn-fill px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-warn">
            Demo
          </span>
        ) : (
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="flex min-h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-bg">
              <LogOut size={15} strokeWidth={2.2} />
              Sign out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
