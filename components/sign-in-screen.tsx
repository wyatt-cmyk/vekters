import { CalendarDays } from "lucide-react";
import { signIn } from "@/auth";
import { Notice } from "./notice";

export function SignInScreen({ expired }: { expired: boolean }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      {/* Left-aligned editorial block rather than a centred card. */}
      <div className="w-full max-w-xl">
        <CalendarDays size={30} strokeWidth={1.6} className="mb-6 text-accent" />
        <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          School and sports.
          <br />
          One calendar.
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">
          Practices, games and assignments in one week. Paste a text from your coach and it becomes an event.
        </p>

        {expired && (
          <div className="mt-6">
            <Notice>Your Google session expired. Please sign in again.</Notice>
          </div>
        )}

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button className="min-h-12 rounded-full bg-ink px-8 font-semibold text-white hover:opacity-90">
            Sign in with Google
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">Use the Google account your school calendar is on.</p>
      </div>
    </main>
  );
}

// Shown when the deployment has no Google credentials at all. Without this the
// sign-in button simply fails, which looks like a bug rather than a setting.
export function NotConfigured() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        <h1 className="font-display text-4xl tracking-[-0.01em]">Not set up yet</h1>
        <p className="mt-4 text-muted">
          This copy of Vekters has no Google credentials, so there&apos;s nothing to sign in to. Whoever deployed it
          needs to set <code>AUTH_GOOGLE_ID</code>, <code>AUTH_GOOGLE_SECRET</code> and <code>AUTH_SECRET</code>, then
          redeploy.
        </p>
        <p className="mt-3 text-sm text-muted">The steps are in SETUP.md and DEPLOY.md in the repository.</p>
      </div>
    </main>
  );
}
