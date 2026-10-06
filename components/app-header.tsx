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
    <header className="flex flex-wrap items-center gap-4 bg-ink px-4 py-3 text-white">
      <Link href="/" className="font-display text-2xl leading-none tracking-tight">
        Athlete Calendar
      </Link>

      <div className="ml-auto flex items-center gap-3">
        {userName && <span className="hidden text-sm text-white/60 sm:inline">{userName}</span>}
        <Link
          href={link.href}
          className="flex min-h-11 items-center border border-white/25 px-4 text-sm font-semibold hover:bg-white/10"
        >
          {link.label}
        </Link>
        {mode === "demo" ? (
          <span className="bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-accent-ink">Demo</span>
        ) : (
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="flex min-h-11 items-center gap-2 border border-white/25 px-4 text-sm font-semibold hover:bg-white/10">
              <LogOut size={16} strokeWidth={2.25} />
              Sign out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
