// The 316px right rail, holding two things: the assistant and, when an event
// is selected, its details.
//
// The design has no home for the AI chat, and at 1366px a third column doesn't
// fit, so the two share this rail as tabs. Selecting an event switches to
// Details; the Assistant tab switches back without losing the selection.
//
// Both panels stay mounted and one is hidden, rather than swapping, so the
// conversation survives a trip to Details and back.

import Link from "next/link";
import { ChatPanel } from "./chat-panel";

type Props = {
  tab: "assistant" | "details";
  assistantHref: string;
  detailsHref?: string; // absent when no event is selected
  details?: React.ReactNode;
};

export function RightRail({ tab, assistantHref, detailsHref, details }: Props) {
  const showDetails = tab === "details" && Boolean(details);

  return (
    <aside
      aria-label="Assistant and event details"
      className="order-first flex max-h-[60vh] flex-col border-b border-line bg-panel xl:order-none xl:max-h-none xl:w-rail xl:shrink-0 xl:border-b-0 xl:border-l"
    >
      <div className="flex gap-1 border-b border-line px-3 pt-3" role="tablist">
        <Tab href={assistantHref} active={!showDetails}>
          Assistant
        </Tab>
        {detailsHref && (
          <Tab href={detailsHref} active={showDetails}>
            Details
          </Tab>
        )}
      </div>

      {/* Hidden rather than unmounted: the chat keeps its conversation. */}
      <div className={`min-h-0 flex-1 ${showDetails ? "hidden" : "flex flex-col"}`}>
        <ChatPanel />
      </div>
      <div className={`min-h-0 flex-1 ${showDetails ? "flex flex-col" : "hidden"}`}>{details}</div>
    </aside>
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
