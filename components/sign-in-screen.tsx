import { CalendarDays } from "lucide-react";
import { signIn } from "@/auth";
import { Notice } from "./notice";

export function SignInScreen({ expired }: { expired: boolean }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-ink px-4 py-16 text-white">
      {/* Left-aligned editorial block rather than a centred card. */}
      <div className="w-full max-w-xl">
        <CalendarDays size={32} strokeWidth={1.5} className="mb-6 text-accent" />
        <h1 className="font-display text-6xl leading-[0.95] tracking-tight sm:text-7xl">
          School and sports.
          <br />
          One calendar.
        </h1>
        <p className="mt-6 max-w-md text-white/70">
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
          <button className="min-h-12 bg-accent px-8 font-semibold text-accent-ink hover:brightness-95">
            Sign in with Google
          </button>
        </form>
        <p className="mt-4 text-sm text-white/50">Use the Google account your school calendar is on.</p>
      </div>
    </main>
  );
}
