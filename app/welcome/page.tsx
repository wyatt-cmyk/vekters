// The landing page on its own route, so it can be looked at (and linked to)
// even while you're signed in or running in demo mode.
import { Landing } from "@/components/landing";

export const metadata = {
  title: "Vekters — school and sports in one week",
  description: "Classes, practices and games in one calendar. Paste your coach's text and it becomes an event.",
};

export default function WelcomePage() {
  return <Landing />;
}
