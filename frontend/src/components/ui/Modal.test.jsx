// @vitest-environment jsdom
import React, { StrictMode, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.style.overflow = "";
});

it("wraps Tab and Shift+Tab at dialog boundaries while skipping disabled and hidden actions", async () => {
  const user = userEvent.setup();
  render(
    <>
      <button>Background</button>
      <Modal isOpen onClose={() => {}} labelledBy="tab-title">
        <h2 id="tab-title">Tab dialog</h2>
        <button>First</button>
        <input aria-label="Middle" />
        <button>Last</button>
        <button disabled>Disabled</button>
        <button hidden>Hidden</button>
      </Modal>
    </>,
  );
  const first = screen.getByRole("button", { name: "First" });
  const last = screen.getByRole("button", { name: "Last" });
  last.focus();
  await user.tab();
  expect(document.activeElement).toBe(first);
  await user.tab({ shift: true });
  expect(document.activeElement).toBe(last);
  await user.tab({ shift: true });
  expect(document.activeElement).toBe(
    screen.getByRole("textbox", { name: "Middle" }),
  );
});

it("keeps the fallback landmark focusable until focus moves elsewhere", () => {
  const view = render(
    <>
      <main>Main content</main>
      <Modal isOpen onClose={() => {}} labelledBy="fallback-title">
        <h2 id="fallback-title">Fallback dialog</h2>
        <button>Close</button>
      </Modal>
      <button>Next</button>
    </>,
  );
  view.rerender(
    <>
      <main>Main content</main>
      <Modal isOpen={false} onClose={() => {}} labelledBy="fallback-title" />
      <button>Next</button>
    </>,
  );
  const main = screen.getByRole("main");
  expect(document.activeElement).toBe(main);
  expect(main.getAttribute("tabindex")).toBe("-1");
  screen.getByRole("button", { name: "Next" }).focus();
  expect(main.hasAttribute("tabindex")).toBe(false);
});

it("revalidates the opener after an account subtree replacement commits", async () => {
  function Replacement() {
    const [open, setOpen] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);
    return loggedIn ? (
      <main>Account content</main>
    ) : (
      <div>
        <button onClick={() => setOpen(true)}>Login launcher</button>
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          labelledBy="login-title"
        >
          <h2 id="login-title">Login</h2>
          <button onClick={() => setLoggedIn(true)}>Complete login</button>
        </Modal>
      </div>
    );
  }
  const user = userEvent.setup();
  render(<Replacement />);
  await user.click(screen.getByRole("button", { name: "Login launcher" }));
  await user.click(screen.getByRole("button", { name: "Complete login" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("main"));
  expect(document.body.style.overflow).toBe("");
});

function Harness() {
  const [open, setOpen] = useState(false);
  const [upper, setUpper] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open first</button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        labelledBy="first-title"
      >
        <div>
          <h2 id="first-title">First dialog</h2>
          <button onClick={() => setOpen(false)}>Close first</button>
          <button onClick={() => setUpper(true)}>Open upper</button>
        </div>
      </Modal>
      <Modal
        isOpen={upper}
        onClose={() => setUpper(false)}
        labelledBy="upper-title"
      >
        <div>
          <h2 id="upper-title">Upper dialog</h2>
          <button onClick={() => setUpper(false)}>Close upper</button>
        </div>
      </Modal>
    </>
  );
}

it("opens a named native modal and places initial focus inside it", async () => {
  const show = vi.spyOn(HTMLDialogElement.prototype, "showModal");
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole("button", { name: "Open first" }));
  const dialog = screen.getByRole("dialog", { name: "First dialog" });
  expect(dialog.tagName).toBe("DIALOG");
  expect(dialog.open).toBe(true);
  expect(show).toHaveBeenCalledTimes(1);
  expect(dialog.contains(document.activeElement)).toBe(true);
  expect(document.body.style.overflow).toBe("hidden");
});

it("handles native cancel as a controlled close and returns focus to its opener", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const opener = screen.getByRole("button", { name: "Open first" });
  await user.click(opener);
  const dialog = screen.getByRole("dialog", { name: "First dialog" });
  const event = new Event("cancel", { cancelable: true });
  fireEvent(dialog, event);
  expect(event.defaultPrevented).toBe(true);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(opener);
  expect(document.body.style.overflow).toBe("");
});

it("keeps scroll locked through stacked closes and restores focus into the remaining dialog", async () => {
  document.body.style.overflow = "auto";
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole("button", { name: "Open first" }));
  const upperOpener = screen.getByRole("button", { name: "Open upper" });
  await user.click(upperOpener);
  const upper = screen.getByRole("dialog", { name: "Upper dialog" });
  expect(upper.contains(document.activeElement)).toBe(true);
  fireEvent(upper, new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog", { name: "Upper dialog" })).toBeNull();
  expect(document.activeElement).toBe(upperOpener);
  expect(document.body.style.overflow).toBe("hidden");
  await user.click(screen.getByRole("button", { name: "Close first" }));
  expect(document.body.style.overflow).toBe("auto");
});

it("does not reopen or move focus when an inline callback changes", () => {
  const show = vi.spyOn(HTMLDialogElement.prototype, "showModal");
  const view = render(
    <Modal isOpen onClose={() => {}} labelledBy="title">
      <h2 id="title">Dialog</h2>
      <button>First</button>
      <input aria-label="Draft" />
    </Modal>,
  );
  const input = screen.getByRole("textbox");
  input.focus();
  view.rerender(
    <Modal isOpen onClose={() => {}} labelledBy="title">
      <h2 id="title">Dialog</h2>
      <button>First</button>
      <input aria-label="Draft" />
    </Modal>,
  );
  expect(show).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(input);
});

it("handles StrictMode cleanup without leaving scroll locked after unmount", () => {
  const close = vi.spyOn(HTMLDialogElement.prototype, "close");
  const view = render(
    <StrictMode>
      <Modal isOpen onClose={() => {}} labelledBy="strict-title">
        <h2 id="strict-title">Strict dialog</h2>
        <button>Close</button>
      </Modal>
    </StrictMode>,
  );
  expect(screen.getByRole("dialog").open).toBe(true);
  view.unmount();
  expect(document.body.style.overflow).toBe("");
  expect(close).toHaveBeenCalled();
});

it("does not steal focus from the upper dialog when the lower one closes", () => {
  const children = (
    <>
      <h2 id="upper">Upper</h2>
      <button>Upper action</button>
    </>
  );
  const view = render(
    <>
      <Modal isOpen onClose={() => {}} labelledBy="lower">
        <h2 id="lower">Lower</h2>
        <button>Lower action</button>
      </Modal>
      <Modal isOpen onClose={() => {}} labelledBy="upper">
        {children}
      </Modal>
    </>,
  );
  const upper = screen.getByRole("dialog", { name: "Upper" });
  within(upper).getByRole("button").focus();
  view.rerender(
    <>
      <Modal isOpen={false} onClose={() => {}} labelledBy="lower">
        <h2 id="lower">Lower</h2>
      </Modal>
      <Modal isOpen onClose={() => {}} labelledBy="upper">
        {children}
      </Modal>
    </>,
  );
  expect(upper.contains(document.activeElement)).toBe(true);
  expect(document.body.style.overflow).toBe("hidden");
});
