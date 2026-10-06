"use client";
// The AI chat panel. This is a client component: it runs in the browser so it
// can keep the conversation in memory and react to typing and clicks.
// It never talks to Claude directly: it calls our own /api/chat endpoint, and
// the server (which holds the API key) talks to Claude.

import { useEffect, useRef, useState } from "react";
import { confirmProposal } from "@/app/actions";
import { cancelledTitle, changedFields, describeWhen, type EventProposal } from "@/lib/proposals";

type CardStatus = "pending" | "saving" | "added" | "dismissed";

type Item =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string; isError?: boolean }
  | { kind: "proposal"; id: string; proposal: EventProposal; status: CardStatus; error?: string };

const EXAMPLES = [
  "Coach: Extra practice tomorrow 6:30am at the track, bring spikes",
  "What does my week look like?",
];

export function ChatPanel() {
  const [items, setItems] = useState<Item[]>([]);
  // The full conversation as the server returned it. We send it back each time
  // because the server doesn't store anything between requests.
  const [history, setHistory] = useState<unknown[]>([]);
  // Things the AI should know on the next message, like "the user confirmed X".
  const [notes, setNotes] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pendingCount = items.filter((i) => i.kind === "proposal" && i.status === "pending").length;

  // Scroll to the newest message whenever the list changes.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [items, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setItems((prev) => [...prev, { kind: "user", id: crypto.randomUUID(), text: message }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");

      setHistory(data.history);
      setNotes([]);
      const proposals: EventProposal[] = data.proposals;
      setItems((prev) => [
        ...prev,
        ...(data.reply ? [{ kind: "assistant" as const, id: crypto.randomUUID(), text: data.reply }] : []),
        ...proposals.map((p) => ({ kind: "proposal" as const, id: p.id, proposal: p, status: "pending" as const })),
      ]);
    } catch (err) {
      setItems((prev) => [
        ...prev,
        { kind: "assistant", id: crypto.randomUUID(), text: err instanceof Error ? err.message : String(err), isError: true },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function updateCard(id: string, changes: Partial<Extract<Item, { kind: "proposal" }>>) {
    setItems((prev) => prev.map((item) => (item.kind === "proposal" && item.id === id ? { ...item, ...changes } : item)));
  }

  async function confirm(p: EventProposal) {
    updateCard(p.id, { status: "saving", error: undefined });
    const result = await confirmProposal(p);
    if (result.ok) {
      updateCard(p.id, { status: "added" });
      setNotes((prev) => [...prev, `The student confirmed the ${p.action} of "${p.title}" on ${p.date}. It is done.`]);
    } else {
      updateCard(p.id, { status: "pending", error: result.error });
    }
  }

  // Confirms every card still waiting. Useful when one message produces a lot of
  // them, like renaming every practice in a season.
  async function confirmAll() {
    const pending = items.filter((i) => i.kind === "proposal" && i.status === "pending");
    for (const item of pending) {
      if (item.kind === "proposal") await confirm(item.proposal);
    }
  }

  function dismiss(p: EventProposal) {
    updateCard(p.id, { status: "dismissed" });
    setNotes((prev) => [...prev, `The student dismissed the card for "${p.title}" on ${p.date}. Nothing changed.`]);
  }

  return (
    <aside className="order-first flex max-h-[70vh] flex-col border-b border-line bg-surface xl:order-none xl:max-h-none xl:w-[380px] xl:shrink-0 xl:border-b-0 xl:border-l">
      <h2 className="border-b border-line px-4 py-3 font-heading text-xl font-bold uppercase tracking-wide">AI Assistant</h2>

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {items.length === 0 && (
          <div className="text-sm text-muted">
            <p>Paste a text from your coach or teacher and I&apos;ll turn it into calendar events. Nothing is added until you tap Confirm.</p>
            <p className="mt-3 font-semibold text-ink">Try:</p>
            <ul className="mt-1 flex flex-col gap-2">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    onClick={() => setInput(example)}
                    className="min-h-11 w-full rounded-md border border-line px-3 py-2 text-left hover:bg-bg"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {items.map((item) => {
          if (item.kind === "user") {
            return (
              <p key={item.id} className="ml-8 whitespace-pre-wrap rounded-lg bg-ink px-3 py-2 text-white">
                {item.text}
              </p>
            );
          }
          if (item.kind === "assistant") {
            return (
              <p
                key={item.id}
                className={`mr-8 whitespace-pre-wrap rounded-lg px-3 py-2 ${
                  item.isError ? "border border-warn-line bg-warn-fill text-warn" : "bg-bg"
                }`}
              >
                {item.text}
              </p>
            );
          }
          return <ProposalCard key={item.id} item={item} onConfirm={confirm} onDismiss={dismiss} />;
        })}

        {busy && <p className="text-sm text-muted">Thinking…</p>}
      </div>

      {pendingCount > 1 && (
        <div className="border-t border-line px-3 py-2">
          <button
            onClick={confirmAll}
            className="min-h-11 w-full rounded-md bg-ink px-4 font-semibold text-white hover:opacity-90"
          >
            Confirm all {pendingCount}
          </button>
        </div>
      )}

      <form
        className="border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds a new line (pasted texts often have several). Ctrl/Cmd+Enter sends.
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={3}
          placeholder="Paste a message, or ask about your week…"
          className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 focus:border-ink focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted">Ctrl + Enter to send</span>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="min-h-11 rounded-md bg-ink px-5 font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}

const TAG_STYLE = {
  school: "bg-school-fill text-school",
  sports: "bg-sports-fill text-sports",
  other: "bg-bg text-muted",
};

// What the card calls itself, and what it says once it's done.
const ACTION_LABEL = { create: "New event", update: "Change", cancel: "Cancel" } as const;
const DONE_LABEL = { create: "Added to your calendar", update: "Calendar updated", cancel: "Marked cancelled" } as const;

function ProposalCard({
  item,
  onConfirm,
  onDismiss,
}: {
  item: Extract<Item, { kind: "proposal" }>;
  onConfirm: (p: EventProposal) => void;
  onDismiss: (p: EventProposal) => void;
}) {
  const p = item.proposal;
  const changed = changedFields(p);

  return (
    <div className={`rounded-lg border border-line bg-surface ${item.status === "dismissed" ? "opacity-50" : ""}`}>
      <div className={`rounded-t-lg px-3 py-2 ${TAG_STYLE[p.tag]}`}>
        <p className="text-[11px] font-bold uppercase tracking-wider">
          {ACTION_LABEL[p.action]} · {p.calendarName}
        </p>
        <p className="font-semibold text-ink">{p.title}</p>
      </div>

      <div className="px-3 py-2 text-sm">
        {p.action === "update" && p.before ? (
          <>
            {/* Show what it was, then what it becomes, so nothing is a surprise. */}
            <p className="text-muted line-through">{describeWhen(p.before)}</p>
            <p className="font-heading text-base font-semibold">{describeWhen(p)}</p>
            {p.before.title !== p.title && <p className="text-muted">Renamed from &ldquo;{p.before.title}&rdquo;</p>}
            {changed.length > 0 && <p className="mt-1 text-muted">Changes the {changed.join(", ")}.</p>}
          </>
        ) : (
          <p className="font-heading text-base font-semibold">{describeWhen(p)}</p>
        )}

        {p.location && <p className="text-muted">{p.location}</p>}
        {p.notes && p.action !== "cancel" && <p className="text-muted">{p.notes}</p>}

        {p.action === "cancel" && (
          <p className="mt-2 text-muted">
            It stays on your calendar, renamed &ldquo;{cancelledTitle(p.title)}&rdquo;, so you can still see it was called off.
          </p>
        )}

        {p.endTimeDefaulted && p.action !== "cancel" && (
          <p className="mt-2 rounded-md border border-warn-line bg-warn-fill px-2 py-1 text-warn">
            No end time was given, so it&apos;s set to 2 hours.
          </p>
        )}
        {item.error && <p className="mt-2 text-warn">{item.error}</p>}
      </div>

      <div className="flex gap-2 px-3 pb-3">
        {item.status === "added" && <p className="font-semibold text-sports">✓ {DONE_LABEL[p.action]}</p>}
        {item.status === "dismissed" && <p className="text-muted">Dismissed</p>}
        {(item.status === "pending" || item.status === "saving") && (
          <>
            <button
              onClick={() => onConfirm(p)}
              disabled={item.status === "saving"}
              className="min-h-11 flex-1 rounded-md bg-ink font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {item.status === "saving" ? "Saving…" : "Confirm"}
            </button>
            <button
              onClick={() => onDismiss(p)}
              disabled={item.status === "saving"}
              className="min-h-11 rounded-md border border-line px-4 font-semibold hover:bg-bg"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}
