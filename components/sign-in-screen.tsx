import { signIn } from "@/auth";
import { Notice } from "./notice";

export function SignInScreen({ expired }: { expired: boolean }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-heading text-5xl font-bold uppercase tracking-wide">Athlete Calendar</h1>
      <p className="max-w-md text-muted">
        School and sports in one place. Sign in with the Google account your school calendar is on.
      </p>
      {expired && <Notice>Your Google session expired. Please sign in again.</Notice>}
      {/* A server action: the sign-in runs on the server when the form is submitted. */}
      <form
        action={async () => {
          "use server";
          await signIn("google");
        }}
      >
        <button className="min-h-11 rounded-md bg-ink px-6 font-semibold text-white hover:opacity-90">
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
