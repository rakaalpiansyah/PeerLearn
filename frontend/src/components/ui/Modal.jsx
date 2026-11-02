import React, { useLayoutEffect, useRef } from "react";

const activeDialogs = [];
let originalOverflow = "";

function tabStops(dialog) {
  return Array.from(
    dialog.querySelectorAll(
      "button, a[href], input, select, textarea, summary, [tabindex]",
    ),
  ).filter((element) => {
    const style = getComputedStyle(element);
    return (
      element.tabIndex >= 0 &&
      !element.matches(':disabled, [type="hidden"]') &&
      !element.closest("[hidden], [inert]") &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      (!element.checkVisibility || element.checkVisibility())
    );
  });
}

function focusInside(dialog) {
  (tabStops(dialog)[0] || dialog).focus({ preventScroll: true });
}

function restoreFocus(opener) {
  const upper = activeDialogs.at(-1);
  if (upper) {
    if (!upper.contains(document.activeElement)) {
      if (opener?.isConnected && upper.contains(opener))
        opener.focus({ preventScroll: true });
      else focusInside(upper);
    }
    return;
  }
  if (
    opener?.isConnected &&
    opener !== document.body &&
    !opener.closest("dialog:not([open])")
  ) {
    opener.focus({ preventScroll: true });
    if (document.activeElement === opener) return;
  }
  const main = document.querySelector("main");
  if (!main) return;
  if (!main.hasAttribute("tabindex")) {
    main.setAttribute("tabindex", "-1");
    main.addEventListener(
      "blur",
      () => {
        if (main.getAttribute("tabindex") === "-1")
          main.removeAttribute("tabindex");
      },
      { once: true },
    );
  }
  main.focus({ preventScroll: true });
}

export function Modal({ isOpen, onClose, labelledBy, children }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    if (activeDialogs.length === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    activeDialogs.push(dialog);
    focusInside(dialog);

    return () => {
      const index = activeDialogs.indexOf(dialog);
      activeDialogs.splice(index, 1);
      if (dialog.open) dialog.close();
      if (activeDialogs.length === 0)
        document.body.style.overflow = originalOverflow;
      restoreFocus(opener);
      // Layout cleanup runs before React removes the outgoing account's launcher.
      // Recheck after the commit, without taking focus away from a newer dialog.
      queueMicrotask(() => restoreFocus(opener));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-modal="true"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const stops = tabStops(event.currentTarget);
        const first = stops[0];
        const last = stops.at(-1);
        if (!first) {
          event.preventDefault();
          event.currentTarget.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none items-center justify-center overflow-hidden border-0 bg-transparent p-3 sm:p-4 text-slate-900 open:flex backdrop:bg-slate-900/45 backdrop:backdrop-blur-xs"
    >
      {children}
    </dialog>
  );
}
