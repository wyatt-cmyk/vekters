"use client";
// Search in the calendar header. Types straight into the URL (`?q=`) after a
// short pause, so the server re-renders the filtered views and the search is
// part of the address like everything else here.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

export function SearchBox({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    // A pause, so a soft navigation doesn't fire on every keystroke.
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      const trimmed = value.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      if (next.toString() !== params.toString()) {
        router.replace(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [value, params, pathname, router]);

  return (
    <div className="relative">
      <label htmlFor="event-search" className="sr-only">
        Search events
      </label>
      <Search
        size={15}
        strokeWidth={1.8}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        id="event-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search"
        className="h-9 w-[140px] rounded-control border border-line-strong bg-surface pl-9 pr-8 text-[14px] focus:border-ink focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors duration-[var(--vk-dur-fast)] hover:bg-hover hover:text-ink"
        >
          <X size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
