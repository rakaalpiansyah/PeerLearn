// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSessionUrl,
  buildSKPIVerifyUrl,
  clearSessionPath,
  clearSKPIVerifyPath,
  getSessionIdFromPath,
  getSKPIVerifyIdFromPath,
  pushSessionPath,
} from "./sessionRoute";

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("sessionRoute helpers", () => {
  it("parses valid /sesi/:id paths and rejects non-session paths", () => {
    expect(getSessionIdFromPath("/")).toBeNull();
    expect(getSessionIdFromPath("/sesi")).toBeNull();
    expect(getSessionIdFromPath("/sesi/")).toBeNull();
    expect(getSessionIdFromPath("/sesi/abc-123-def")).toBe("abc-123-def");
    expect(getSessionIdFromPath("/sesi/session-42/")).toBe("session-42");
    expect(getSessionIdFromPath("/sesi/a/b")).toBeNull();
  });

  it("builds full shareable session URLs", () => {
    const url = buildSessionUrl("grp-99");
    expect(url).toBe(`${window.location.origin}/sesi/grp-99`);
  });

  it("pushes and clears browser history path cleanly", () => {
    pushSessionPath("grp-99");
    expect(window.location.pathname).toBe("/sesi/grp-99");

    // Calling again on same path does not duplicate
    pushSessionPath("grp-99");
    expect(window.location.pathname).toBe("/sesi/grp-99");

    clearSessionPath();
    expect(window.location.pathname).toBe("/");
  });

  it("parses, builds, and clears /verifikasi-skpi/:id routes", () => {
    expect(getSKPIVerifyIdFromPath("/verifikasi-skpi/")).toBeNull();
    expect(getSKPIVerifyIdFromPath("/verifikasi-skpi/abc-123")).toBe("abc-123");
    expect(buildSKPIVerifyUrl("user-1")).toBe(
      `${window.location.origin}/verifikasi-skpi/user-1`
    );

    window.history.pushState({}, "", "/verifikasi-skpi/user-1");
    clearSKPIVerifyPath();
    expect(window.location.pathname).toBe("/");
  });
});
