// The assistant and the event details, sharing one surface.
//
// The design has no home for the AI chat, and at 1366px a third column doesn't
// fit, so the two live here as tabs. Selecting an event switches to Details;
// the Assistant tab switches back without dropping the selection.
//
// Two shapes, one component: below 1024px it rises as a bottom sheet, the way
// the mobile design handles details; above that it's the fixed right column.
//
// Both panels stay mounted and one is hidden, rather than swapping, so the
// conversation survives a trip to Details and back.

import Link from "next/link";
import { ChatPanel, type Viewing } from "./chat-panel";

type Props = {
  tab: "assistant" | "details";
  assistantHref: string;
  detailsHref?: string; // absent when no event is selected
  details?: React.ReactNode;
  // On a small screen the rail is a sheet, so it needs to know when to rise
  // and where tapping away goes.
  open: boolean;
  closeHref: string;
  viewing: Viewing; // what the calendar is showing, so the assistant can use it
};

export function RightRail({ tab, assistantHref, detailsHref, details, open, closeHref, viewing }: Props) {
  const showDetails = tab === "details" && Boolean(details);

  return (
    <>
      {/* Tapping away closes the sheet. Only exists on small screens. */}
      {open && (
        <Link
          href={closeHref}
          aria-label="Close"
          className="scrim fixed inset-0 z-40 bg-ink/30 lg:hidden"
        />
      )}

      <aside
        aria-label="Assistant and event details"
        className={`${
          open ? "rail-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] rounded-t-sheet border-t border-line" : "hidden"
        } flex-col bg-panel lg:static lg:z-auto lg:flex lg:max-h-none lg:w-rail lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0`}
      >
        {/* The sheet's grab handle, as in the mobile design. */}
        <div aria-hidden="true" className="flex justify-center pt-2.5 lg:hidden">
          <span className="h-1 w-10 rounded-full bg-line-strong" />
        </div>

        <div className="flex gap-1 border-b border-line px-3 pt-3" role="tablist">
          <Tab href={assistantHref} active={!showDetails}>
            Assistant
          </Tab>
          {detailsHref && (
            <Tab href={detailsHref} active={showDetails}>
              Details
            </Tab>
          )}
          <Link
            href={closeHref}
            aria-label={showDetails ? "Close event details" : "Close"}
            className={`ml-auto mb-1 grid size-8 place-items-center rounded-control text-muted transition-colors duration-[var(--vk-dur-fast)] hover:bg-hover hover:text-ink ${
              showDetails ? "" : "lg:hidden"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
        </div>

        {/* Hidden rather than unmounted: the chat keeps its conversation. */}
        <div className={`min-h-0 flex-1 ${showDetails ? "hidden" : "flex flex-col"}`}>
          <ChatPanel viewing={viewing} />
        </div>
        <div className={`min-h-0 flex-1 ${showDetails ? "flex flex-col" : "hidden"}`}>{details}</div>
      </aside>
    </>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={`-mb-px border-b-2 px-3 pb-2.5 text-[13px] transition-colors duration-[var(--vk-dur-fast)] ${
        active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
