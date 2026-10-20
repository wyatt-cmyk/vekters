"use client";
// The only two pieces of the week grid that need the browser: the line showing
// the current time, and scrolling the grid to the morning on load. Everything
// else is rendered on the server.

import { useEffect, useRef, useState } from "react";
import { HOUR_PX } from "@/lib/week-layout";

// A red-free, ink line across today's column, moved every minute.
// It renders nothing until mounted, so the server and the browser can't
// disagree about what time it is.
export function NowLine({ timeZone, startHour, endHour }: { timeZone: string; startHour: number; endHour: number }) {
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    const read = () => {
      const now = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date());
      const [h, m] = now.split(":").map(Number);
      setMinutes(h * 60 + m);
    };
    read();
    const timer = setInterval(read, 60_000);
    return () => clearInterval(timer);
  }, [timeZone]);

  if (minutes === null) return null;
  if (minutes < startHour * 60 || minutes > endHour * 60) return null;

  const top = ((minutes - startHour * 60) / 60) * HOUR_PX;

  return (
    <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top }} aria-hidden="true">
      <div className="h-px bg-ink" />
      <div className="absolute -left-[3px] -top-[3px] size-[7px] rounded-full bg-ink" />
    </div>
  );
}

// Puts the grid at the given hour when the page opens, so you land on the
// morning rather than at midnight.
export function ScrollToHour({ offset }: { offset: number }) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scroller = marker.current?.closest("[data-week-scroll]");
    if (scroller instanceof HTMLElement) scroller.scrollTop = offset;
  }, [offset]);

  return <span ref={marker} aria-hidden="true" className="hidden" />;
}
