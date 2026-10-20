// Working out where each event sits on the hour grid.
//
// Pure functions, no React and no server bits, so they can be reasoned about
// (and tested) on their own. The lane packing is ported from `layout()` in
// vekters-handoff/design/Main.dc.html.

import type { CalendarEvent } from "./google-calendar";
import { toDayKey, toLocalDateTime, type DayKey } from "./week";

export const HOUR_PX = 64; // --vk-hour-h
export const DEFAULT_START_HOUR = 6; // the design's grid runs 6 AM ...
export const DEFAULT_END_HOUR = 22; // ... to 10 PM
const MIN_EVENT_MINUTES = 20; // so a 5-minute event is still readable and tappable

export type Placed = {
  event: CalendarEvent;
  startMin: number; // minutes from midnight, in the student's time zone
  endMin: number;
  lane: number; // which column within an overlapping cluster
  lanes: number; // how many columns that cluster needs
};

// How many minutes past local midnight an instant falls.
function localMinutes(iso: string, timeZone: string) {
  const time = toLocalDateTime(new Date(iso), timeZone).slice(11);
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isAllDay(event: CalendarEvent) {
  return Boolean(event.start.date);
}

// Where a timed event starts and ends *on this day*. An event that runs past
// midnight is cut at the day boundary, so it reads correctly in both columns.
export function minutesOn(event: CalendarEvent, day: DayKey, timeZone: string) {
  const startsOn = toDayKey(new Date(event.start.dateTime!), timeZone);
  const endsOn = toDayKey(new Date(event.end.dateTime!), timeZone);

  const startMin = startsOn === day ? localMinutes(event.start.dateTime!, timeZone) : 0;
  const rawEnd = endsOn === day ? localMinutes(event.end.dateTime!, timeZone) : 24 * 60;
  return { startMin, endMin: Math.max(rawEnd, startMin + MIN_EVENT_MINUTES) };
}

// Side-by-side lanes for events that overlap. Ported from the design:
// group into clusters that touch, then give each event the first lane whose
// previous event has already finished.
export function assignLanes(items: Placed[]) {
  items.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const clusters: Placed[][] = [];
  let current: Placed[] = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (current.length && item.startMin >= clusterEnd) {
      clusters.push(current);
      current = [];
      clusterEnd = -1;
    }
    current.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  if (current.length) clusters.push(current);

  for (const cluster of clusters) {
    const laneEnds: number[] = [];
    for (const item of cluster) {
      let lane = laneEnds.findIndex((end) => end <= item.startMin);
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(item.endMin);
      } else {
        laneEnds[lane] = item.endMin;
      }
      item.lane = lane;
    }
    for (const item of cluster) item.lanes = laneEnds.length;
  }

  return items;
}

// The timed events of one day, positioned and lane-packed.
export function placeDay(events: CalendarEvent[], day: DayKey, timeZone: string): Placed[] {
  const placed = events
    .filter((event) => !isAllDay(event))
    .map((event) => ({ event, ...minutesOn(event, day, timeZone), lane: 0, lanes: 1 }));
  return assignLanes(placed);
}

// The design fixes the grid at 6 AM to 10 PM. A 5 AM practice would fall off
// it, so the window stretches to hold whatever the week actually contains
// rather than hiding anything.
export function hourWindow(byDay: Map<DayKey, Placed[]>) {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;

  for (const placed of byDay.values()) {
    for (const item of placed) {
      startHour = Math.min(startHour, Math.floor(item.startMin / 60));
      endHour = Math.max(endHour, Math.ceil(item.endMin / 60));
    }
  }
  return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) };
}

// Top offset and height in pixels for a placed event.
export function boxOf(item: Placed, startHour: number) {
  const top = ((item.startMin - startHour * 60) / 60) * HOUR_PX;
  const height = ((item.endMin - item.startMin) / 60) * HOUR_PX;
  return { top, height };
}

// "07:00" for the hour cell links.
export function hourLabelValue(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

// "7 AM" / "07" depending on the clock setting.
export function hourLabel(hour: number, clock: "12" | "24") {
  if (clock === "24") return `${String(hour).padStart(2, "0")}:00`;
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}
