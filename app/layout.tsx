import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";

// The Vekters pairing: a modern sans for everything functional, and a
// high-contrast editorial serif used only for big moments like the month
// heading and an event title.
const displaySerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const bodySans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Vekters",
  description: "School and sports in one calendar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${displaySerif.variable} ${bodySans.variable} h-full antialiased`}>
      {/* Browser extensions (Grammarly, password managers and the like) add
          their own attributes to <body> before React hydrates, which React
          then reports as a mismatch. suppressHydrationWarning covers this one
          element's attributes only, so a real mismatch anywhere inside the app
          is still reported. */}
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
