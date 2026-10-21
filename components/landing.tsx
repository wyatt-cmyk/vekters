// The front door, for anyone who opens the link before signing in.
//
// Same materials as the app — paper, ink, Geist, Instrument Serif, the five
// calendar pastels — but at a different scale. This page is read once, so it
// can afford big type and a lot of air; the calendar is used every day, so it
// stays dense and quiet. Don't push this scale into the week view.
//
// All the motion is CSS scroll-driven animation (see globals.css). Content is
// visible by default, so nothing depends on JavaScript or on the browser
// supporting scroll timelines.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { signIn } from "@/auth";

export function Landing() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
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
    <header className="nav-settle fixed inset-x-0 top-0 z-50 border-b border-line backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1400px] items-center gap-8 px-6 py-5 lg:px-10">
        <Link href="/welcome" aria-label="Vekters">
          <Image
            src="/brand/vekters-wordmark.png"
            alt="Vekters"
            width={943}
            height={178}
            priority
            className="h-[21px] w-auto"
          />
        </Link>
        <nav className="ml-auto flex items-center gap-7 text-[14px] text-muted">
          <a href="#how" className="hidden transition-colors duration-[var(--vk-dur-fast)] hover:text-ink sm:inline">
            How it works
          </a>
          <a href="#yours" className="hidden transition-colors duration-[var(--vk-dur-fast)] hover:text-ink sm:inline">
            Your data
          </a>
          <Link href="/" className="transition-colors duration-[var(--vk-dur-fast)] hover:text-ink">
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
        <p className="mb-8 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">For student athletes</p>
        <h1
          className="font-medium leading-[0.86] tracking-[-0.045em]"
          style={{ fontSize: "clamp(3.25rem, 10.5vw, 9rem)" }}
        >
          Two schedules.
          <br />
          <span className="font-display font-normal italic tracking-[-0.02em]">One week.</span>
        </h1>
      </div>

      {/* Offset lower and right, so the hero isn't a centred block. */}
      <div className="col-span-12 mt-12 lg:col-span-5 lg:col-start-8 lg:mt-20">
        <p className="max-w-[46ch] text-[18px] leading-[1.65] text-muted lg:text-[20px]">
          Classes and assignments live in one calendar. Practices, games and the bus time arrive as texts at nine at
          night. Vekters holds both, and turns the texts into events you approve.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button className="group flex min-h-[52px] items-center gap-3 rounded-control bg-ink px-7 text-[15px] font-medium text-white transition-colors duration-[var(--vk-dur-fast)] hover:bg-black">
              Sign in with Google
              <ArrowRight size={17} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />
            </button>
          </form>
          <Link
            href="/"
            className="flex min-h-[52px] items-center rounded-control border border-line-strong px-7 text-[15px] font-medium transition-colors duration-[var(--vk-dur-fast)] hover:bg-hover"
          >
            Look around first
          </Link>
        </div>
      </div>

      {/* The thing that starts it all. */}
      <figure className="reveal col-span-12 mt-20 lg:col-span-6 lg:col-start-2 lg:mt-32">
        <blockquote className="max-w-[30rem] rounded-card rounded-bl-[4px] bg-nav-active px-6 py-5 text-[17px] leading-[1.5]">
          Practice moved to 4:30 tomorrow, weight room not the field. Bus for Friday leaves at 2:45 sharp.
        </blockquote>
        <figcaption className="mt-3 pl-1 text-[13px] text-muted">Coach, 9:14pm, the night before</figcaption>
      </figure>
    </section>
  );
}

/* ---------- a single statement, full bleed ---------- */

function Promise_() {
  return (
    <section className="reveal bg-ink px-6 py-24 text-bg lg:px-10 lg:py-36">
      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-x-6">
        <h2
          className="col-span-12 font-medium leading-[0.95] tracking-[-0.035em] lg:col-span-8"
          style={{ fontSize: "clamp(2.5rem, 5.5vw, 5.5rem)" }}
        >
          Nothing changes until you say so.
        </h2>
        <p className="col-span-12 mt-8 max-w-[44ch] text-[17px] leading-[1.7] text-bg/65 lg:col-span-4 lg:mt-4 lg:text-[18px]">
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
    body: "Assignments and games on one grid, coloured however you like. A late game followed by a test the next morning stops being a surprise on the morning of.",
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
          <li key={moment.n} className="reveal grid grid-cols-12 gap-x-6 gap-y-5 border-t border-line py-12 lg:py-16">
            <span className="font-display col-span-2 text-[22px] italic text-muted lg:col-span-1 lg:text-[26px]">
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
            <p className="col-span-12 max-w-[52ch] text-[17px] leading-[1.7] text-muted lg:col-span-5 lg:col-start-8 lg:text-[18px]">
              {moment.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- the week, full bleed ---------- */

// The same five pastels the app uses, from lib/settings.ts.
const BLUE = { bg: "#dce7f5", edge: "#6f8fbf61" };
const GREEN = { bg: "#dfebdd", edge: "#7a9f7261" };
const LAVENDER = { bg: "#e8e3f3", edge: "#8c7dbe61" };

const MOCK_DAYS = [
  {
    day: "MON",
    n: "19",
    events: [
      { c: BLUE, t: "Biology lab report", w: "All day" },
      { c: GREEN, t: "Practice", w: "3:30 – 5:30" },
    ],
  },
  {
    day: "TUE",
    n: "20",
    today: true,
    events: [
      { c: BLUE, t: "English essay draft", w: "8:00 AM" },
      { c: GREEN, t: "Practice", w: "3:30 – 5:30" },
    ],
  },
  { day: "WED", n: "21", events: [{ c: GREEN, t: "Game vs. Lincoln", w: "6 – 8 PM" }] },
  {
    day: "THU",
    n: "22",
    events: [
      { c: BLUE, t: "History unit 2 test", w: "9 – 10 AM" },
      { c: GREEN, t: "Recovery practice", w: "4:30 – 6:00" },
    ],
  },
  {
    day: "FRI",
    n: "23",
    events: [
      { c: GREEN, t: "Bus departs", w: "2:45 PM" },
      { c: GREEN, t: "Game @ Westview", w: "4 – 6 PM" },
    ],
  },
  { day: "SAT", n: "24", events: [{ c: GREEN, t: "Film session", w: "10 – 11 AM" }] },
  { day: "SUN", n: "25", events: [{ c: LAVENDER, t: "Study group", w: "3 – 5 PM" }] },
];

function WeekShowcase() {
  return (
    <section className="reveal overflow-hidden bg-nav-active px-6 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">One week, both lives</p>

        {/* A still of the real week view. Seven columns can't shrink to a phone,
            so on a narrow screen it scrolls sideways inside its own box. */}
        <div className="-mx-6 overflow-x-auto px-6 lg:mx-0 lg:px-0">
          <div
            className="grid min-w-[760px] grid-cols-7 gap-2 rounded-card border border-line bg-surface p-4 lg:min-w-0 lg:gap-3 lg:p-6"
            aria-hidden="true"
          >
            {MOCK_DAYS.map((d) => (
              <div key={d.n} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-0.5 pb-1">
                  <span className="text-[9px] font-semibold tracking-[0.12em] text-muted">{d.day}</span>
                  {d.today ? (
                    <span className="nums grid h-[22px] min-w-[22px] place-items-center rounded-full bg-ink px-1.5 text-[13px] text-white">
                      {d.n}
                    </span>
                  ) : (
                    <span className="nums text-[15px]">{d.n}</span>
                  )}
                </div>
                {d.events.map((e) => (
                  <div
                    key={e.t}
                    className="rounded-event border px-2 py-1.5"
                    style={{ backgroundColor: e.c.bg, borderColor: e.c.edge }}
                  >
                    <p className="text-[11px] font-medium leading-tight">{e.t}</p>
                    <p className="nums text-[9.5px] text-on-event">{e.w}</p>
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

const PROMISES: [string, string][] = [
  [
    "It writes to Google Calendar",
    "Not to a copy. Whatever you confirm here shows up on your phone, your watch and anywhere else you already look.",
  ],
  [
    "Nothing is stored elsewhere",
    "There's no second database holding your week. Vekters reads your calendars when you open it and forgets them when you close it.",
  ],
  [
    "You can undo it the normal way",
    "Every change is an ordinary calendar event. Edit or delete it here, or in Google Calendar, whichever is closer to hand.",
  ],
];

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
          {PROMISES.map(([term, detail]) => (
            <div key={term} className="border-t border-line py-7">
              <dt className="text-[19px] font-medium tracking-[-0.02em]">{term}</dt>
              <dd className="mt-2 max-w-[52ch] text-[16px] leading-[1.7] text-muted">{detail}</dd>
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
    <footer className="bg-ink px-6 pb-12 pt-10 text-bg lg:px-10">
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
              <button className="on-dark group flex min-h-[52px] w-full items-center justify-center gap-3 rounded-control bg-bg px-7 text-[15px] font-medium text-ink transition-opacity duration-[var(--vk-dur-fast)] hover:opacity-90">
                Sign in with Google
                <ArrowRight size={17} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />
              </button>
            </form>
            <p className="text-[14px] leading-[1.6] text-bg/65">Use the Google account your school calendar is on.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-bg/15 pt-7 text-[13px] text-bg/65">
          <Image
            src="/brand/vekters-v-light.png"
            alt="Vekters"
            width={220}
            height={172}
            className="h-[18px] w-auto opacity-80"
          />
          <span>Built by a student, for a team.</span>
          <Link href="/" className="on-dark ml-auto transition-colors duration-[var(--vk-dur-fast)] hover:text-bg">
            See a demo week
          </Link>
        </div>
      </div>
    </footer>
  );
}
