"use client";
// A real <dialog>, opened with showModal().
//
// Doing it natively rather than with a positioned div buys three things that
// are tedious to get right by hand: focus moves into the dialog and is trapped
// there, Escape closes it, and everything behind becomes inert to the
// keyboard and to screen readers.
//
// Which dialog is open is still decided by the URL, so closing means
// navigating back to `closeHref` rather than flipping a piece of state.

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function Modal({
  closeHref,
  labelledBy,
  children,
}: {
  closeHref: string;
  labelledBy: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      // Fires for Escape as well as a programmatic close.
      onClose={() => router.push(closeHref)}
      // A click that lands on the dialog itself is a click on the backdrop,
      // because the card inside covers everything else.
      onClick={(event) => {
        if (event.target === ref.current) router.push(closeHref);
      }}
      className="m-auto w-full max-w-md bg-transparent"
    >
      <div className="max-h-[90dvh] overflow-y-auto rounded-card border border-line bg-surface shadow-xl">
        {children}
      </div>
    </dialog>
  );
}
