// Top bar shared by every page: app name, a link to the other page, and
// either "Sign out" (real Google data) or a "Demo" badge (sample data).
import Link from "next/link";
import { signOut } from "@/auth";

type Props = {
  mode: "demo" | "google";
  userName?: string | null;
  link: { href: string; label: string };
};

export function AppHeader({ mode, userName, link }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2">
      <Link href="/" className="font-heading text-2xl font-bold uppercase tracking-wide">
        Athlete Calendar
      </Link>
      <div className="ml-auto flex items-center gap-3">
        {userName && <span className="hidden text-sm text-muted sm:inline">{userName}</span>}
        <Link
          href={link.href}
          className="flex min-h-11 items-center rounded-md border border-line px-4 font-semibold hover:bg-bg"
        >
          {link.label}
        </Link>
        {mode === "demo" ? (
          <span className="rounded-md bg-warn-fill px-3 py-1 text-sm font-bold uppercase text-warn">Demo</span>
        ) : (
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="min-h-11 rounded-md border border-line px-4 font-semibold hover:bg-bg">Sign out</button>
          </form>
        )}
      </div>
    </header>
  );
}
