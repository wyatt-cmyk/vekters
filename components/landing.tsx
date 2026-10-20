// The landing page: the app's front door, for anyone who opens the link before
// they've signed in. It's a separate design language from the app itself —
// editorial, big type, lots of air — because its job is to explain, not to be
// used every day. The app stays dense and quiet.
//
// All the motion is CSS scroll-driven animation (see globals.css). Content is
// visible by default, so nothing depends on JavaScript or on the browser
// supporting scroll timelines.

import Link from "next/link";
import { Geist } from "next/font/google";
import { ArrowRight } from "lucide-react";
import { signIn } from "@/auth";

// Loaded here rather than in the root layout, so the app's own pages don't
// carry a font they never use.
const geist = Geist({ variable: "--font-geist", subsets: ["latin"], weight: ["400", "500", "600"] });

const INK = "#171717";
const MUTED = "#6a6a66"; // the brief's #777 fails contrast on this background; this passes
const PAPER = "#f5f5f0";
const SOFT = "#eaeae6";
const LINE = "#e2e2dc";
const ACCENT = "#b8482a";

export function Landing() {
  return (
    <div
      className={`${geist.variable} min-h-dvh`}
      style={{ background: PAPER, color: INK, fontFamily: "var(--font-geist), system-ui, sans-serif" }}
    >
      <Nav />
      <Hero />
      <Promise_ />
      <Moments />
      <WeekShowcase />
      <Trust />
      <Closing />
    </div>
  );
}

/* ---------- navigation ---------- */

function Nav() {
  return (
    <header
      className="nav-settle fixed inset-x-0 top-0 z-50 border-b backdrop-blur-sm"
      style={{ borderBottomColor: LINE }}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-8 px-6 py-5 lg:px-10">
        <Link href="/welcome" className="text-[15px] font-medium tracking-tight">
          Athlete Calendar
        </Link>
        <nav className="ml-auto flex items-center gap-7 text-[14px]" style={{ color: MUTED }}>
          <a href="#how" className="hidden transition-colors hover:text-[#171717] sm:inline">
            How it works
          </a>
          <a href="#yours" className="hidden transition-colors hover:text-[#171717] sm:inline">
            Your data
          </a>
          <Link href="/" className="transition-colors hover:text-[#171717]">
            Demo
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ---------- hero ---------- */

function Hero() {
  return (
    <section className="mx-auto grid max-w-[1400px] grid-cols-12 gap-x-6 px-6 pb-24 pt-40 lg:px-10 lg:pb-40 lg:pt-56">
      <div className="col-span-12 lg:col-span-9">
        <p className="mb-8 text-[12px] font-medium uppercase tracking-[0.18em]" style={{ color: MUTED }}>
          For student athletes
        </p>
        <h1
          className="font-medium leading-[0.86] tracking-[-0.045em]"
          style={{ fontSize: "clamp(3.25rem, 10.5vw, 9rem)" }}
        >
          Two schedules.
          <br />
          <span className="font-display font-normal italic tracking-[-0.02em]">One week.</span>
        </h1>
      </div>

      {/* Offset lower and to the right, so the hero isn't a centred block. */}
      <div className="col-span-12 mt-12 lg:col-span-5 lg:col-start-8 lg:mt-20">
        <p className="max-w-[46ch] text-[18px] leading-[1.65] lg:text-[20px]" style={{ color: MUTED }}>
          Classes and assignments live in one calendar. Practices, games and the bus time arrive as texts at nine at
          night. This holds both, and turns the texts into events you approve.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button
              className="group flex min-h-[52px] items-center gap-3 rounded-full px-7 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: INK }}
            >
              Sign in with Google
              <ArrowRight size={17} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />
            </button>
          </form>
          <Link
            href="/"
            className="flex min-h-[52px] items-center rounded-full border px-7 text-[15px] font-medium transition-colors hover:bg-[#eaeae6]"
            style={{ borderColor: LINE }}
          >
            Look around first
          </Link>
        </div>
      </div>

      {/* The thing that starts it all. */}
      <figure className="reveal col-span-12 mt-20 lg:col-span-6 lg:col-start-2 lg:mt-32">
        <blockquote
          className="max-w-[30rem] rounded-[20px] rounded-bl-[4px] px-6 py-5 text-[17px] leading-[1.5]"
          style={{ background: SOFT }}
        >
          Practice moved to 4:30 tomorrow, weight room not the field. Bus for Friday leaves at 2:45 sharp.
        </blockquote>
        <figcaption className="mt-3 pl-1 text-[13px]" style={{ color: MUTED }}>
          Coach, 9:14pm, the night before
        </figcaption>
      </figure>
    </section>
  );
}

/* ---------- a single statement, full bleed ---------- */

function Promise_() {
  return (
    <section className="reveal px-6 py-24 lg:px-10 lg:py-36" style={{ background: INK, color: PAPER }}>
      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-x-6">
        <h2
          className="col-span-12 font-medium leading-[0.95] tracking-[-0.035em] lg:col-span-8"
          style={{ fontSize: "clamp(2.5rem, 5.5vw, 5.5rem)" }}
        >
          Nothing changes until you say so.
        </h2>
        <p
          className="col-span-12 mt-8 max-w-[44ch] text-[17px] leading-[1.7] lg:col-span-4 lg:mt-4 lg:text-[18px]"
          style={{ color: "#a8a8a2" }}
        >
          Every create, move and cancel arrives as a card showing exactly what will change. It only touches your
          calendar when you tap Confirm. No surprises, no silent edits.
        </p>
      </div>
    </section>
  );
}

/* ---------- three moments ---------- */

const MOMENTS = [
  {
    n: "01",
    title: "Paste the text",
    body: "Drop the message straight from your phone. It works out that Thursday means the 22nd, finds the practice already on your calendar, and shows you the change before it makes it.",
  },
  {
    n: "02",
    title: "Import the season",
    body: "A photo of the schedule taped inside your locker, or a PDF from the team email. Every game and every practice comes back as a checklist, with duplicates and missing times already flagged.",
  },
  {
    n: "03",
    title: "See the whole week",
    body: "Assignments and games in one place, coloured however you like. A late game followed by a test the next morning stops being a surprise on the morning of.",
  },
];

function Moments() {
  return (
    <section id="how" className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-36">
      <div className="grid grid-cols-12 gap-x-6">
        <h2
          className="col-span-12 mb-16 font-medium leading-[0.95] tracking-[-0.035em] lg:col-span-7 lg:mb-24"
          style={{ fontSize: "clamp(2.25rem, 4.5vw, 4.25rem)" }}
        >
          Three moments it has to get right.
        </h2>
      </div>

      <ol className="flex flex-col">
        {MOMENTS.map((moment, index) => (
          <li
            key={moment.n}
            className="reveal grid grid-cols-12 gap-x-6 gap-y-5 border-t py-12 lg:py-16"
            style={{ borderTopColor: LINE }}
          >
            <span
              className="col-span-2 font-display text-[22px] italic lg:col-span-1 lg:text-[26px]"
              style={{ color: ACCENT }}
            >
              {moment.n}
            </span>
            <h3
              className={`col-span-10 self-start font-medium leading-[1.05] tracking-[-0.03em] lg:col-span-4 ${
                index % 2 === 1 ? "lg:col-start-3" : ""
              }`}
              style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)" }}
            >
              {moment.title}
            </h3>
            <p
              className="col-span-12 max-w-[52ch] text-[17px] leading-[1.7] lg:col-span-5 lg:col-start-8 lg:text-[18px]"
              style={{ color: MUTED }}
            >
              {moment.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- the week, full bleed ---------- */

const MOCK_DAYS = [
  { day: "MON", n: "19", events: [{ cal: "Toddle", c: "#2a52c9", t: "Biology lab report", w: "All day" }, { cal: "Varsity Soccer", c: "#15715a", t: "Practice", w: "3:30 – 5:30" }] },
  { day: "TUE", n: "20", today: true, events: [{ cal: "Toddle", c: "#2a52c9", t: "English essay draft", w: "8:00 AM" }, { cal: "Varsity Soccer", c: "#15715a", t: "Practice", w: "3:30 – 5:30" }] },
  { day: "WED", n: "21", events: [{ cal: "Varsity Soccer", c: "#15715a", t: "Game vs. Lincoln", w: "6 – 8 PM" }] },
  { day: "THU", n: "22", events: [{ cal: "Toddle", c: "#2a52c9", t: "History unit 2 test", w: "9 – 10 AM" }, { cal: "Varsity Soccer", c: "#15715a", t: "Recovery practice", w: "4:30 – 6:00" }] },
  { day: "FRI", n: "23", events: [{ cal: "Varsity Soccer", c: "#15715a", t: "Bus departs", w: "2:45 PM" }, { cal: "Varsity Soccer", c: "#15715a", t: "Game @ Westview", w: "4 – 6 PM" }] },
  { day: "SAT", n: "24", events: [{ cal: "Varsity Soccer", c: "#15715a", t: "Film session", w: "10 – 11 AM" }] },
  { day: "SUN", n: "25", events: [{ cal: "Personal", c: "#5a6360", t: "Study group", w: "3 – 5 PM" }] },
];

function WeekShowcase() {
  return (
    <section className="reveal overflow-hidden px-6 py-20 lg:px-10 lg:py-28" style={{ background: SOFT }}>
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-10 max-w-[36ch] text-[13px] font-medium uppercase tracking-[0.18em]" style={{ color: MUTED }}>
          One week, both lives
        </p>

        {/* A still of the real week view. Seven columns can't shrink to a phone,
            so on a narrow screen it scrolls sideways inside its own box. */}
        <div className="-mx-6 overflow-x-auto px-6 lg:mx-0 lg:px-0">
          <div
            className="grid min-w-[760px] grid-cols-7 gap-2 rounded-[18px] border p-4 lg:min-w-0 lg:gap-3 lg:p-6"
            style={{ background: "#ffffff", borderColor: LINE }}
            aria-hidden="true"
          >
            {MOCK_DAYS.map((d) => (
              <div key={d.n} className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 px-0.5 pb-1">
                <span className="text-[9px] font-semibold tracking-[0.12em]" style={{ color: d.today ? ACCENT : "#9a9a95" }}>
                  {d.day}
                </span>
                {d.today ? (
                  <span
                    className="grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 font-display text-[13px] text-white"
                    style={{ background: ACCENT }}
                  >
                    {d.n}
                  </span>
                ) : (
                  <span className="font-display text-[16px]">{d.n}</span>
                )}
              </div>
              {d.events.map((e) => (
                <div key={e.t} className="rounded-[10px] border px-2 py-1.5" style={{ borderColor: LINE }}>
                  <p className="truncate text-[7.5px] font-bold uppercase tracking-[0.1em]" style={{ color: e.c }}>
                    {e.cal}
                  </p>
                  <p className="text-[11px] font-semibold leading-tight">{e.t}</p>
                  <p className="text-[9.5px]" style={{ color: MUTED }}>
                    {e.w}
                  </p>
                </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- trust ---------- */

function Trust() {
  return (
    <section id="yours" className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-36">
      <div className="grid grid-cols-12 gap-x-6 gap-y-10">
        <h2
          className="reveal col-span-12 font-medium leading-[0.95] tracking-[-0.035em] lg:col-span-5"
          style={{ fontSize: "clamp(2.25rem, 4.5vw, 4.25rem)" }}
        >
          It stays your calendar.
        </h2>

        <dl className="reveal col-span-12 flex flex-col lg:col-span-6 lg:col-start-7">
          {[
            ["It writes to Google Calendar", "Not to a copy. Whatever you confirm here shows up on your phone, your watch and anywhere else you already look."],
            ["Nothing is stored elsewhere", "There's no second database holding your week. The app reads your calendars when you open it and forgets them when you close it."],
            ["You can undo it the normal way", "Every change is an ordinary calendar event. Edit or delete it here, or in Google Calendar, whichever is closer to hand."],
          ].map(([term, detail]) => (
            <div key={term} className="border-t py-7" style={{ borderTopColor: LINE }}>
              <dt className="text-[19px] font-medium tracking-[-0.02em]">{term}</dt>
              <dd className="mt-2 max-w-[52ch] text-[16px] leading-[1.7]" style={{ color: MUTED }}>
                {detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ---------- closing ---------- */

function Closing() {
  return (
    <footer className="px-6 pb-12 pt-10 lg:px-10" style={{ background: INK, color: PAPER }}>
      <div className="mx-auto max-w-[1400px]">
        <div className="reveal grid grid-cols-12 gap-x-6 gap-y-10 py-20 lg:py-28">
          <h2
            className="col-span-12 font-medium leading-[0.92] tracking-[-0.04em] lg:col-span-8"
            style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}
          >
            Start with
            <br />
            <span className="font-display font-normal italic">this week.</span>
          </h2>

          <div className="col-span-12 flex flex-col justify-end gap-6 lg:col-span-4">
            <form
              action={async () => {
                "use server";
                await signIn("google");
              }}
            >
              <button
                className="on-dark group flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full px-7 text-[15px] font-medium transition-opacity hover:opacity-90"
                style={{ background: PAPER, color: INK }}
              >
                Sign in with Google
                <ArrowRight size={17} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />
              </button>
            </form>
            <p className="text-[14px] leading-[1.6]" style={{ color: "#a8a8a2" }}>
              Use the Google account your school calendar is on.
            </p>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t pt-7 text-[13px]"
          style={{ borderTopColor: "#2f2f2d", color: "#a8a8a2" }}
        >
          <span>Athlete Calendar</span>
          <span>Built by a student, for a team.</span>
          <Link href="/" className="on-dark ml-auto transition-colors hover:text-[#f5f5f0]">
            See a demo week
          </Link>
        </div>
      </div>
    </footer>
  );
}
