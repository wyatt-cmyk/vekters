# Vekters Homepage: Design Handoff

Read this file first. It explains what's in this folder and how to turn it into real code in the Vekters project.

## What this is

A finished, interactive design for the Vekters calendar homepage, made in Claude Design:

- a desktop week view (with Day and Month views and an event details panel)
- a mobile day agenda (with a bottom sheet for event details)

The files in `design/` are the source of truth for layout, spacing, color, type and interactions. They are **not** production code. They're written in a canvas-specific format (explained below), so rebuild them using this project's own framework, components and styling system.

## Folder contents

| Path | What it is |
|---|---|
| `design/Main.dc.html` | Desktop design, 1440 x 900. Sidebar, header, week/day/month views, details panel. |
| `design/Mobile.dc.html` | Mobile design, 390 x 844. Monogram header, day picker, agenda list, bottom sheet. |
| `design/DESIGN_SPEC.md` | The original written spec. If it disagrees with the design files, follow the design files (see "Intentional changes"). |
| `tokens/tokens.css` | Colors, fonts, type sizes, radii, layout sizes, motion as CSS variables. |
| `tokens/tokens.json` | Same tokens as JSON, handy for iOS or a theme config. |
| `assets/vekters-wordmark.png` | Full wordmark, transparent, dark. Desktop sidebar. |
| `assets/vekters-v.png` | V monogram, transparent, dark. Mobile header and panel watermark. |
| `assets/vekters-v-light.png` | V monogram, transparent, light. For dark backgrounds. |
| `assets/reference/` | Original brand boards, for visual reference only. |

## How to read the .dc.html files

- The visible markup lives inside `<x-dc>`. Styles are inline on each element. Shared hover, focus and animation classes are in the `<helmet><style>` block near the top.
- `{{name}}` is a value computed in `renderVals()`, inside the `<script type="text/x-dc">` block at the bottom of each file. Read `renderVals()` to see how every value is derived.
- `<sc-for list="{{items}}" as="item">` is a loop. `<sc-if value="{{flag}}">` is a conditional.
- `onClick="{{fn}}"` binds a handler that `renderVals()` returns.
- `<script src="./support.js">` is the canvas runtime. Ignore it.
- Image URLs starting with `/_blob/` map to these files:
  - `/_blob/b826ab554234b9ca406e429c6989aa1e` = `assets/vekters-wordmark.png`
  - `/_blob/717b9c34de6cf5d7c2e9a1d4c10a9190` = `assets/vekters-v.png`
  - `/_blob/8e995b7b7c9a2557016c3f622c646006` = `assets/vekters-v-light.png`
- The logic in the script blocks (date math, overlap layout, event creation, navigation) is plain JavaScript and can be ported almost directly.

## Implementation plan

1. **Inspect the existing codebase first.** Find the framework, routing, styling approach, calendar data model, event create/edit/delete, and any calendar sync or schedule import already in place. Preserve everything that works today.
2. **Add the tokens** from `tokens/` to the project's theme or global styles.
3. **Load the fonts:** Geist (400, 500, 600) and Instrument Serif (regular and italic). Both are on Google Fonts.
4. **Build the layout shell:** sidebar 252px, main area flexible, details panel 316px that only appears when an event is selected.
5. **Week view:** 64px per hour, 6 AM to 10 PM, a 64px time gutter, sticky header with weekday labels plus an all-day row, overlap lanes (port `layout()`), and the current-time line on today's column only.
6. **Day and Month views.** Day is the same grid with one column. Month is a 6 x 7 grid with up to 3 event chips per day and a "+N more" label.
7. **Event details panel** with Edit and Delete wired to real data.
8. **Mobile layout** below roughly 768px, following `Mobile.dc.html`.
9. **Polish:** motion, `prefers-reduced-motion`, keyboard access, focus rings.

## Behavior to keep

- Clicking an empty time slot creates a one-hour event at that hour and opens the panel in edit mode.
- New Event creates an event on the selected day: at the next full hour if that day is today, otherwise at 9 AM.
- Week navigation keeps the selected weekday. Day navigation moves one day. Month navigation moves one month.
- Clicking a day header (or a date in Month view) opens that day in Day view.
- The mini calendar jumps to any date and highlights the visible week.
- Calendar toggles in the sidebar hide that calendar's events in every view.
- Search filters events by title as you type.
- Overlapping events split into side-by-side lanes.
- The grid scrolls to 7 AM on load.
- The current-time line updates every minute.
- Selected events get a 1.5px inset dark outline. Hovered events get slightly more saturated.

## Intentional changes from the written spec

- Secondary text is `#6B6B66` instead of `#777777`. The original falls just under the 4.5:1 contrast minimum on white. The new value passes on both white and `#F5F5F0` and looks nearly identical.
- Out-of-month dates in the mini calendar use `#6F6F69`.
- Time and location text on pastel event blocks use `#4F4F4A` for contrast.
- Each calendar has a darker "dot" color for indicators and checkboxes (see tokens). Pastels are still used for event backgrounds.
- Delete buttons use `#9B2C2C` text.

## Placeholder content (don't ship)

All events, times, locations, attendees and notes in the design are sample data. Wire every view to the real calendar data. The calendar names (School, Athletics, Personal, Social, Flight Training) are also samples; use the user's real calendars.

## Not designed yet

- Drag to reschedule and drag to resize events.
- Tasks, Search and Settings pages (the sidebar only highlights them).
- Tablet layout with a collapsible sidebar.
- Edit and Delete in the mobile bottom sheet are visual only in the design; wire them like desktop.
- The logo PNGs were cut from the brand board. If an original vector (SVG) logo exists, use that instead.
