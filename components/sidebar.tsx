// The 252px left rail: wordmark, navigation, and the list of calendars.
//
// Phase 1 of the Vekters design. The mini calendar belongs here too, but it
// lands with the Day and Month views, and the visibility toggles land with
// search, so for now the calendar list is a legend rather than a control.

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, FileInput, LogOut, Settings, Sun } from "lucide-react";
import { signOut } from "@/auth";
import { MiniCalendar } from "./mini-calendar";
import type { DayKey } from "@/lib/week";

type CalendarRow = { id: string; name: string; color: string };

type Props = {
  mode: "demo" | "google";
  userName?: string | null;
  calendars: CalendarRow[];
  active: "calendar" | "import" | "settings";
  todayHref: string;
  // Only the calendar page has a date to centre the mini calendar on.
  mini?: {
    month: DayKey;
    today: DayKey;
    weekStart: "mon" | "sun";
    visibleFrom: DayKey;
    visibleTo: DayKey;
    accent: string;
    dayHref: (day: DayKey) => string;
    monthHref: (month: DayKey) => string;
  };
};

const NAV_BASE =
  "flex min-h-10 items-center gap-2.5 rounded-control px-3 text-[14px] transition-colors duration-[var(--vk-dur-fast)]";

export function Sidebar({ mode, userName, calendars, active, todayHref, mini }: Props) {
  return (
    <aside className="flex w-sidebar shrink-0 flex-col border-r border-line bg-bg">
      <div className="px-5 pb-6 pt-6">
        <Link href="/" aria-label="Vekters, go to the calendar">
          <Image
            src="/brand/vekters-wordmark.png"
            alt="Vekters"
            width={943}
            height={178}
            priority
            className="h-[22px] w-auto"
          />
        </Link>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        <NavItem href="/" label="Calendar" active={active === "calendar"}>
          <CalendarDays size={16} strokeWidth={1.8} />
        </NavItem>
        <NavItem href={todayHref} label="Today" active={false}>
          <Sun size={16} strokeWidth={1.8} />
        </NavItem>
        <NavItem href="/import" label="Import" active={active === "import"}>
          <FileInput size={16} strokeWidth={1.8} />
        </NavItem>
        <NavItem href="/calendars" label="Settings" active={active === "settings"}>
          <Settings size={16} strokeWidth={1.8} />
        </NavItem>
      </nav>

      {mini && (
        <div className="mt-7 px-4">
          <MiniCalendar {...mini} />
        </div>
      )}

      <div className="mt-7 px-5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">My calendars</h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {calendars.map((cal) => (
            <li key={cal.id} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: cal.color }}
              />
              <span className="truncate text-[13px] text-body">{cal.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto border-t border-line px-5 py-4">
        {mode === "demo" ? (
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Demo data</p>
        ) : (
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{userName}</span>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                aria-label="Sign out"
                className="flex size-9 items-center justify-center rounded-control text-muted transition-colors duration-[var(--vk-dur-fast)] hover:bg-hover hover:text-ink"
              >
                <LogOut size={15} strokeWidth={1.8} />
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${NAV_BASE} ${active ? "bg-nav-active text-ink" : "text-body hover:bg-hover"}`}
    >
      <span className="text-muted">{children}</span>
      {label}
    </Link>
  );
}
