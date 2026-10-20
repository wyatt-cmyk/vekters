// The event details panel, as it appears in the right rail.
//
// The design calls for an editorial information sheet rather than a popup: a
// small category label, the title set large in the serif, then the facts.
// Fields the design shows that our event data has no room for — a cover photo,
// reminders, recurrence — are left out rather than faked. Description and
// attendees come straight from Google when the event has them.

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, Pencil, Trash2, Users } from "lucide-react";
import type { CalendarEvent } from "@/lib/google-calendar";
import { describeWhen, isCancelledTitle, snapshotOf } from "@/lib/proposals";

type Props = {
  event: CalendarEvent;
  paint: { bg: string; dot: string };
  timeZone: string;
  editHref: string;
  deleteHref: string;
  canEdit: boolean;
};

export function EventPanel({ event, paint, timeZone, editHref, deleteHref, canEdit }: Props) {
  const when = snapshotOf(event, timeZone);
  const cancelled = event.status === "cancelled" || isCancelledTitle(event.summary);
  const attendees = event.attendees ?? [];

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* The monogram sits behind the sheet, the way the design uses it. */}
      <Image
        src="/brand/vekters-v.png"
        alt=""
        width={220}
        height={172}
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-2 right-3 w-[132px] opacity-[0.045]"
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-5 pt-5">
        {/* The dot carries the colour; the words stay readable. */}
        <p className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ backgroundColor: paint.dot }} />
          {event.calendarName}
        </p>

        <h3
          className={`font-display text-[32px] leading-[1.05] tracking-[-0.01em] ${cancelled ? "line-through" : ""}`}
        >
          {event.summary ?? "(no title)"}
        </h3>

        <dl className="mt-6 flex flex-col gap-4 border-t border-line pt-5">
          <Row icon={<CalendarDays size={15} strokeWidth={1.7} />} label="When">
            <span className="nums">{cancelled ? "Cancelled" : describeWhen(when)}</span>
          </Row>

          {event.location && (
            <Row icon={<MapPin size={15} strokeWidth={1.7} />} label="Where">
              {event.location}
            </Row>
          )}

          {event.description && (
            <Row label="Notes">
              <span className="whitespace-pre-wrap text-body">{event.description}</span>
            </Row>
          )}

          {attendees.length > 0 && (
            <Row icon={<Users size={15} strokeWidth={1.7} />} label={`Who (${attendees.length})`}>
              <ul className="flex flex-col gap-0.5">
                {attendees.slice(0, 8).map((person, index) => (
                  <li key={person.email ?? index} className="truncate">
                    {person.displayName ?? person.email ?? "Someone"}
                    {person.self && <span className="text-muted"> (you)</span>}
                  </li>
                ))}
                {attendees.length > 8 && (
                  <li className="text-muted">and {attendees.length - 8} more</li>
                )}
              </ul>
            </Row>
          )}
        </dl>

        {!canEdit && (
          <p className="mt-6 text-[13px] text-muted">
            This calendar is read-only, so this event can&apos;t be changed here.
          </p>
        )}
      </div>

      {canEdit && (
        <div className="relative flex gap-2 border-t border-line px-5 py-4">
          <Link
            href={editHref}
            className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-control bg-ink text-[14px] text-white transition-colors duration-[var(--vk-dur-fast)] hover:bg-black"
          >
            <Pencil size={15} strokeWidth={1.9} />
            Edit
          </Link>
          <Link
            href={deleteHref}
            className="flex min-h-10 items-center gap-2 rounded-control border border-line-strong px-4 text-[14px] text-danger transition-colors duration-[var(--vk-dur-fast)] hover:bg-hover"
          >
            <Trash2 size={15} strokeWidth={1.9} />
            Delete
          </Link>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden="true" className="mt-[3px] w-4 shrink-0 text-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</dt>
        <dd className="mt-1 text-[14px] leading-[1.5]">{children}</dd>
      </div>
    </div>
  );
}
