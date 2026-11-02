// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MySessionsModal } from "./MySessionsModal";
import { membershipApi } from "../../api/client";

const errorMessage = "Sesi Anda belum dapat dimuat.";
const emptyMessage = "Anda belum mendaftar di sesi belajar mana pun.";
const staleDescription =
  "Menampilkan data terakhir yang berhasil dimuat. Data ini mungkin belum terbaru.";
const session = {
  id: "session-1",
  title: "Diskusi Struktur Data",
  category: "Teknologi",
  start_time: "2026-11-02T09:00:00Z",
  user_membership: "accepted",
  current_members: 3,
  max_capacity: 5,
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function success(joined = [], hosted = []) {
  return { success: true, data: { joined, hosted } };
}

function renderModal() {
  const props = { onClose: vi.fn(), onSelectGroup: vi.fn() };
  const view = render(<MySessionsModal {...props} isOpen />);
  return {
    ...view,
    setOpen: (isOpen) =>
      view.rerender(<MySessionsModal {...props} isOpen={isOpen} />),
  };
}

beforeEach(() => {
  vi.spyOn(membershipApi, "getMySessions");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MySessionsModal loading and recovery", () => {
  it("announces initial loading without an empty state and keeps the title and tabs usable", async () => {
    const request = deferred();
    membershipApi.getMySessions.mockReturnValueOnce(request.promise);
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByRole("status").textContent).toContain(
      "Memuat data sesi belajar Anda...",
    );
    expect(
      screen.getByRole("heading", { name: "Sesi Belajar Saya" }),
    ).toBeTruthy();
    expect(screen.queryByText(emptyMessage)).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Sesi Diselenggarakan (0)" }),
    );
    expect(
      screen.queryByText("Anda belum menyelenggarakan sesi belajar."),
    ).toBeNull();

    await act(async () => request.resolve(success()));
    expect(
      screen.getByText("Anda belum menyelenggarakan sesi belajar."),
    ).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows a local error rather than an empty state after a rejected initial request", async () => {
    membershipApi.getMySessions.mockRejectedValueOnce(
      new Error("private backend detail"),
    );
    renderModal();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(errorMessage);
    expect(alert.textContent).toContain(
      "Periksa koneksi Anda, lalu coba lagi.",
    );
    expect(
      within(alert).getByRole("button", { name: "Coba lagi" }).disabled,
    ).toBe(false);
    expect(screen.queryByText(emptyMessage)).toBeNull();
    expect(screen.queryByText(/private backend detail/)).toBeNull();
  });

  it("shows the true empty state only after a successful empty response", async () => {
    membershipApi.getMySessions.mockResolvedValueOnce(success());
    renderModal();

    expect(await screen.findByText(emptyMessage)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("retries successfully and clears the error when rows arrive", async () => {
    membershipApi.getMySessions
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(success([session]));
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole("button", { name: "Coba lagi" }));

    expect(await screen.findByText(session.title)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(emptyMessage)).toBeNull();
  });

  it("treats success:false as a failure even if the response includes data", async () => {
    membershipApi.getMySessions.mockResolvedValueOnce({
      success: false,
      data: { joined: [session], hosted: [] },
      error: { message: "private backend detail" },
    });
    renderModal();

    expect((await screen.findByRole("alert")).textContent).toContain(
      errorMessage,
    );
    expect(screen.queryByText(emptyMessage)).toBeNull();
    expect(screen.queryByText(session.title)).toBeNull();
    expect(screen.queryByText(/private backend detail/)).toBeNull();
  });

  it("keeps the error visible and retry disabled until the pending retry succeeds", async () => {
    const retry = deferred();
    membershipApi.getMySessions
      .mockRejectedValueOnce(new Error("offline"))
      .mockReturnValueOnce(retry.promise);
    const user = userEvent.setup();
    renderModal();
    await user.click(await screen.findByRole("button", { name: "Coba lagi" }));

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(errorMessage);
    const button = within(alert).getByRole("button", { name: "Mencoba lagi…" });
    expect(button.disabled).toBe(true);
    await user.click(button);
    expect(membershipApi.getMySessions).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(emptyMessage)).toBeNull();

    await act(async () => retry.resolve(success()));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(emptyMessage)).toBeTruthy();
  });

  it("allows another retry after a pending retry fails", async () => {
    const retry = deferred();
    membershipApi.getMySessions
      .mockRejectedValueOnce(new Error("offline"))
      .mockReturnValueOnce(retry.promise);
    const user = userEvent.setup();
    renderModal();
    await user.click(await screen.findByRole("button", { name: "Coba lagi" }));
    await act(async () => retry.reject(new Error("still offline")));

    expect(screen.getByRole("alert").textContent).toContain(errorMessage);
    expect(screen.getByRole("button", { name: "Coba lagi" }).disabled).toBe(
      false,
    );
    expect(screen.queryByText(emptyMessage)).toBeNull();
  });

  it("retains joined and hosted rows throughout a reopening refresh, failure, and pending retry", async () => {
    const refresh = deferred();
    const retry = deferred();
    const hosted = { ...session, id: "hosted-1", title: "Bimbingan Algoritma" };
    membershipApi.getMySessions
      .mockResolvedValueOnce(success([session], [hosted]))
      .mockReturnValueOnce(refresh.promise)
      .mockReturnValueOnce(retry.promise);
    const user = userEvent.setup();
    const view = renderModal();
    await screen.findByText(session.title);

    view.setOpen(false);
    view.setOpen(true);
    expect(screen.getByText(session.title)).toBeTruthy();
    expect(screen.getByRole("status")).toBeTruthy();
    await act(async () => refresh.reject(new Error("offline")));
    expect(screen.getByText(session.title)).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(staleDescription);

    await user.click(
      screen.getByRole("button", { name: "Sesi Diselenggarakan (1)" }),
    );
    expect(screen.getByText(hosted.title)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(screen.getByText(hosted.title)).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(staleDescription);
    expect(screen.getByRole("button", { name: "Mencoba lagi…" }).disabled).toBe(
      true,
    );

    await act(async () => retry.resolve(success()));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(hosted.title)).toBeNull();
    expect(
      screen.getByText("Anda belum menyelenggarakan sesi belajar."),
    ).toBeTruthy();
  });

  it.each(["resolve", "reject"])(
    "ignores an obsolete request that finishes with %s after the newest success",
    async (settle) => {
      const oldRequest = deferred();
      const newestRequest = deferred();
      membershipApi.getMySessions
        .mockReturnValueOnce(oldRequest.promise)
        .mockReturnValueOnce(newestRequest.promise);
      const view = renderModal();
      view.setOpen(false);
      view.setOpen(true);
      const newestSession = { ...session, id: "newest", title: "Sesi Terbaru" };
      await act(async () => newestRequest.resolve(success([newestSession])));

      await act(async () => {
        if (settle === "resolve") oldRequest.resolve(success([session]));
        else oldRequest.reject(new Error("obsolete failure"));
      });

      expect(screen.getByText(newestSession.title)).toBeTruthy();
      expect(screen.queryByText(session.title)).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
    },
  );

  it("does not let an obsolete completion clear the newest loading state", async () => {
    const oldRequest = deferred();
    const newestRequest = deferred();
    membershipApi.getMySessions
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newestRequest.promise);
    const view = renderModal();
    view.setOpen(false);
    view.setOpen(true);

    await act(async () => oldRequest.resolve(success([session])));
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByText(session.title)).toBeNull();
    expect(screen.queryByText(emptyMessage)).toBeNull();

    await act(async () => newestRequest.resolve(success()));
    expect(screen.getByText(emptyMessage)).toBeTruthy();
  });

  it("ignores a request settled while closed instead of caching it for reopening", async () => {
    const oldRequest = deferred();
    const refresh = deferred();
    membershipApi.getMySessions
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(refresh.promise);
    const view = renderModal();
    view.setOpen(false);
    await act(async () => oldRequest.resolve(success([session])));
    expect(screen.queryByRole("dialog")).toBeNull();

    view.setOpen(true);
    expect(screen.queryByText(session.title)).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
    await act(async () => refresh.resolve(success()));
    expect(screen.getByText(emptyMessage)).toBeTruthy();
  });

  it.each([
    [null, []],
    [[], null],
    [null, null],
  ])(
    "normalizes nullable arrays: joined=%j hosted=%j",
    async (joined, hosted) => {
      membershipApi.getMySessions.mockResolvedValueOnce(
        success(joined, hosted),
      );
      const user = userEvent.setup();
      renderModal();

      expect(await screen.findByText(emptyMessage)).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Sesi yang Diikuti (0)" }),
      ).toBeTruthy();
      await user.click(
        screen.getByRole("button", { name: "Sesi Diselenggarakan (0)" }),
      );
      expect(
        screen.getByText("Anda belum menyelenggarakan sesi belajar."),
      ).toBeTruthy();
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );
});
