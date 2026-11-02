// @vitest-environment jsdom
import React, { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { authApi } from "../api/client";

const accountA = { id: "user-a", full_name: "Sari" };
const accountB = { id: "user-b", full_name: "Budi" };
let auth;

function Consumer() {
  const context = useAuth();
  useEffect(() => {
    auth = context;
  });
  return (
    <p>
      {context.loading
        ? "Loading"
        : context.user?.full_name || "No verified user"}
    </p>
  );
}
function mount() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("peerlearn_token", "token-a");
  vi.spyOn(authApi, "getMe").mockResolvedValue({
    success: true,
    data: accountA,
  });
  vi.spyOn(authApi, "login").mockResolvedValue({
    success: true,
    data: { token: "token-b", user: accountB },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("profile verification recovery", () => {
  it.each([
    ["network failure", { code: "NETWORK_ERROR" }],
    ["timeout", { code: "NETWORK_ERROR", message: "timeout" }],
    ["server error", { status: 500, code: "UNAUTHORIZED" }],
    ["forbidden", { status: 403 }],
    ["profile unavailable", { status: 404, code: "USER_NOT_FOUND" }],
  ])(
    "retains the token on %s without authenticating an unknown user",
    async (_name, error) => {
      authApi.getMe.mockRejectedValue(error);
      mount();
      await screen.findByText("No verified user");
      expect(localStorage.getItem("peerlearn_token")).toBe("token-a");
      expect(auth.token).toBe("token-a");
      expect(auth.isAuthenticated).toBe(false);
      await waitFor(() => expect(auth.profileError).toBeTruthy());
    },
  );

  it("clears the session only on HTTP 401", async () => {
    authApi.getMe.mockRejectedValue({ status: 401, code: "UNAUTHORIZED" });
    mount();
    await screen.findByText("No verified user");
    await waitFor(() => expect(auth.token).toBeNull());
    expect(localStorage.getItem("peerlearn_token")).toBeNull();
    expect(auth.token).toBeNull();
    expect(auth.profileError).toBeNull();
  });

  it.each([
    { success: false, error: { code: "UNAUTHORIZED" } },
    { success: true, data: null },
    { success: true, data: {} },
  ])("treats an unusable response as recoverable: %j", async (response) => {
    authApi.getMe.mockResolvedValue(response);
    mount();
    await waitFor(() => expect(auth.loading).toBe(false));
    expect(auth.user).toBeNull();
    expect(auth.profileError).toBeTruthy();
    expect(auth.token).toBe("token-a");
  });

  it("recovers with retry without another login", async () => {
    authApi.getMe.mockRejectedValueOnce({ status: 503 });
    mount();
    await screen.findByText("No verified user");
    await act(async () => {
      await auth.retryProfile();
    });
    expect(screen.getByText("Sari")).toBeTruthy();
    expect(auth.profileError).toBeNull();
    expect(auth.isAuthenticated).toBe(true);
  });

  it("retains a verified user and rejects a failed background refresh", async () => {
    mount();
    await screen.findByText("Sari");
    authApi.getMe.mockRejectedValue({ status: 503 });
    await act(async () => {
      await expect(auth.refreshProfile()).rejects.toMatchObject({
        status: 503,
      });
    });
    expect(auth.user).toEqual(accountA);
    expect(auth.profileError).toBeTruthy();
    expect(auth.token).toBe("token-a");
  });

  it("honors a same-session 401 even when a newer refresh fails temporarily", async () => {
    mount();
    await screen.findByText("Sari");
    const first = deferred();
    const second = deferred();
    authApi.getMe
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    let firstResult, secondResult;
    act(() => {
      firstResult = auth.refreshProfile().catch((error) => error);
      secondResult = auth.refreshProfile().catch((error) => error);
    });
    await act(async () => {
      second.reject({ status: 503 });
      await secondResult;
    });
    await act(async () => {
      first.reject({ status: 401 });
      await firstResult;
    });
    expect(auth.user).toBeNull();
    expect(auth.token).toBeNull();
    expect(localStorage.getItem("peerlearn_token")).toBeNull();
  });

  it("still rejects a failed form refresh when another refresh supersedes it", async () => {
    mount();
    await screen.findByText("Sari");
    const first = deferred();
    const second = deferred();
    authApi.getMe
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    let firstResult, secondResult;
    act(() => {
      firstResult = auth.refreshProfile().then(
        () => "resolved",
        (error) => error,
      );
      secondResult = auth.refreshProfile().catch((error) => error);
    });
    await act(async () => {
      first.reject({ status: 503 });
      await firstResult;
    });
    expect(await firstResult).toEqual({ status: 503 });
    await act(async () => {
      second.resolve({ success: true, data: accountA });
      await secondResult;
    });
  });

  it("does not restore a profile after logout while a request is pending", async () => {
    const old = deferred();
    authApi.getMe.mockReturnValueOnce(old.promise);
    mount();
    act(() => auth.logout());
    await act(async () => old.resolve({ success: true, data: accountA }));
    expect(auth.user).toBeNull();
    expect(auth.token).toBeNull();
  });

  it.each(["success", "unauthorized"])(
    "ignores old-account %s after another account logs in",
    async (result) => {
      const old = deferred();
      authApi.getMe
        .mockReturnValueOnce(old.promise)
        .mockResolvedValue({ success: true, data: accountB });
      mount();
      await act(async () => {
        await auth.login("budi@example.com", "password");
      });
      await screen.findByText("Budi");
      await act(async () => {
        if (result === "success")
          old.resolve({ success: true, data: accountA });
        else old.reject({ status: 401 });
      });
      expect(auth.user).toEqual(accountB);
      expect(auth.token).toBe("token-b");
      expect(localStorage.getItem("peerlearn_token")).toBe("token-b");
    },
  );
});
