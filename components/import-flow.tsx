"use client";
// The schedule import screen, in three steps:
//   1. "input":  paste text or pick a file, then "Find events"
//   2. "review": a checklist of the events Claude found, with warnings
//   3. "done":   what was added
// Nothing is written to the calendar until "Add selected" in step 2.

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronRight, Upload } from "lucide-react";
import { confirmImport, type ImportOutcome } from "@/app/actions";
import type { ImportItem } from "@/lib/ai/import";
import { describeWhen } from "@/lib/proposals";
import type { Tag } from "@/lib/tags";

type CalendarOption = { id: string; name: string; tag: Tag };
type Step = "input" | "review" | "done";

const ACCEPT = ".pdf,application/pdf,image/png,image/jpeg,image/webp,image/gif";

export function ImportFlow({ calendars }: { calendars: CalendarOption[] }) {
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ImportItem[]>([]);
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [outcomes, setOutcomes] = useState<ImportOutcome[]>([]);

  // Step 1 -> 2: send the schedule to our server, which asks Claude.
  async function findEvents() {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("text", text);
      if (file) form.set("file", file);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setItems(data.items);
      setScheduleNotes(data.scheduleNotes);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  // Step 2 -> 3: add the checked events.
  async function addSelected() {
    setBusy(true);
    setError("");
    const chosen = items.filter((item) => item.selected).map((item) => item.proposal);
    const result = await confirmImport(chosen);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setOutcomes(result.results);
    setStep("done");
  }

  function startOver() {
    setStep("input");
    setItems([]);
    setOutcomes([]);
    setError("");
    setFile(null);
    setText("");
  }

  function update(index: number, changes: Partial<ImportItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  }

  function changeCalendar(index: number, calendarId: string) {
    const cal = calendars.find((c) => c.id === calendarId);
    if (!cal) return;
    const item = items[index];
    update(index, { proposal: { ...item.proposal, calendarId: cal.id, calendarName: cal.name, tag: cal.tag } });
  }

  const selectedCount = items.filter((item) => item.selected).length;
  const addable = items.filter((item) => !item.problem);

  /* ---------- step 1 ---------- */
  if (step === "input") {
    return (
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Paste your schedule</span>
          <span className="text-sm text-muted">A season schedule, practice plan, syllabus, or a message with lots of dates.</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={"Sep 12  vs Lincoln  4:00\nSep 15  @ Westview  6:30 (bus 4:45)\n..."}
            className="mt-2 w-full rounded-card border border-line bg-surface px-3.5 py-3 font-mono text-sm focus:border-line-strong focus:outline-none"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="font-semibold">Or upload a PDF or screenshot</span>
          <span className="text-sm text-muted">
            PDF, PNG, JPG, WebP, or GIF, up to 4 MB. If you upload a file, anything in the box above is sent as a note about it.
          </span>
          <input
            type="file"
            accept={ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-2 min-h-11 text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:border-line-strong file:bg-surface file:px-4 file:font-semibold hover:file:bg-bg"
          />
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <div className="flex items-center gap-3">
          <button
            onClick={findEvents}
            disabled={busy || (!text.trim() && !file)}
            className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            <Upload size={16} strokeWidth={2.25} />
            {busy ? "Reading your schedule…" : "Find events"}
          </button>
          {busy && <span className="text-sm text-muted">This can take up to a minute for long schedules.</span>}
        </div>
      </div>
    );
  }

  /* ---------- step 3 ---------- */
  if (step === "done") {
    const added = outcomes.filter((o) => o.ok).length;
    const failed = outcomes.filter((o) => !o.ok);
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight text-sports">
          <Check size={28} strokeWidth={2.5} /> Added {added} event{added === 1 ? "" : "s"}
        </p>
        {failed.length > 0 && (
          <ErrorBox>
            {failed.length} couldn&apos;t be added:
            <ul className="mt-1 list-disc pl-5">
              {failed.map((o) => (
                <li key={o.id}>
                  {items.find((i) => i.proposal.id === o.id)?.proposal.title ?? "Event"}: {o.error}
                </li>
              ))}
            </ul>
          </ErrorBox>
        )}
        <div className="flex gap-3">
          <Link href="/" className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white hover:opacity-90">
            See your week <ChevronRight size={16} strokeWidth={2.25} />
          </Link>
          <button onClick={startOver} className="min-h-11 rounded-full border border-line-strong bg-surface px-5 font-semibold hover:bg-bg">
            Import another
          </button>
        </div>
      </div>
    );
  }

  /* ---------- step 2 ---------- */
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto">
          Found <strong>{items.length}</strong> event{items.length === 1 ? "" : "s"}. Check the ones to add.
        </p>
        <button
          onClick={() => setItems((prev) => prev.map((item) => ({ ...item, selected: !item.problem })))}
          className="min-h-11 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold hover:bg-bg"
        >
          Select all
        </button>
        <button
          onClick={() => setItems((prev) => prev.map((item) => ({ ...item, selected: false })))}
          className="min-h-11 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold hover:bg-bg"
        >
          Select none
        </button>
      </div>

      {scheduleNotes && <ErrorBox>{scheduleNotes}</ErrorBox>}

      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {items.map((item, index) => {
          const p = item.proposal;
          return (
            <li key={p.id} className={`flex gap-3 px-3 py-3 ${item.selected ? "" : "opacity-70"}`}>
              {/* The label makes the whole left area clickable, a big touch target. */}
              <label className="flex min-h-11 min-w-11 cursor-pointer items-start justify-center pt-1">
                <input
                  type="checkbox"
                  checked={item.selected}
                  disabled={!!item.problem}
                  onChange={(e) => update(index, { selected: e.target.checked })}
                  className="size-5 accent-ink"
                  aria-label={`Add ${p.title || "event"}`}
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{p.title || "(no title)"}</p>
                <p className="nums font-semibold text-muted">
                  {item.problem ? p.date || "No date" : describeWhen(p)}
                  {p.location && <span className="font-sans font-normal"> · {p.location}</span>}
                </p>
                {item.problem && <p className="mt-1 text-sm text-warn">Can&apos;t add: {item.problem}</p>}
                {item.warnings.map((warning) => (
                  <p key={warning} className="mt-1 rounded-lg bg-warn-fill px-2.5 py-1 text-sm text-warn">
                    {warning}
                  </p>
                ))}
              </div>
              <label className="shrink-0">
                <span className="sr-only">Calendar for {p.title}</span>
                <select
                  value={p.calendarId}
                  onChange={(e) => changeCalendar(index, e.target.value)}
                  disabled={!!item.problem}
                  className="min-h-11 max-w-44 rounded-full border border-line-strong bg-surface px-3 text-sm"
                >
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          );
        })}
      </ul>

      {error && <ErrorBox>{error}</ErrorBox>}

      {/* Stays at the bottom of the screen while scrolling a long list. */}
      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-bg py-3">
        <button
          onClick={addSelected}
          disabled={busy || selectedCount === 0}
          className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          <Check size={16} strokeWidth={2.5} />
          {busy ? "Adding…" : `Add ${selectedCount} event${selectedCount === 1 ? "" : "s"}`}
        </button>
        <button onClick={startOver} disabled={busy} className="min-h-11 rounded-full border border-line-strong bg-surface px-5 font-semibold hover:bg-bg">
          Start over
        </button>
        <span className="text-sm text-muted">
          {selectedCount} of {addable.length} selected
        </span>
      </div>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-card border border-warn-line bg-warn-fill px-4 py-3 text-warn">{children}</div>;
}
