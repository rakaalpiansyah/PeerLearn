// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomePage } from "./HomePage";
import { groupApi, systemApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

vi.mock("../api/client", () => ({
  groupApi: { list: vi.fn(), getRecommendations: vi.fn() },
  systemApi: { getHealth: vi.fn() },
}));
vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));

const group = {
  id: "group-1",
  title: "Diskusi Struktur Data",
  description: "Latihan linked list bersama.",
  category: "Teknologi",
  format: "online",
  status: "open",
  start_time: "2026-11-05T09:00:00Z",
  end_time: "2026-11-05T10:00:00Z",
  max_capacity: 8,
  current_members: 2,
  host: { full_name: "Budi Santoso", contribution_points: 10 },
};
const catalogEmpty = "Belum Ada Sesi Belajar di Kategori Ini";
const catalogError = "Sesi belajar belum dapat dimuat.";
const recError = "Rekomendasi belum dapat dimuat.";

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function renderHome() {
  return render(
    <HomePage
      onStatusUpdate={vi.fn()}
      onOpenAuth={vi.fn()}
      onOpenSkills={vi.fn()}
      onOpenProfile={vi.fn()}
      onOpenCreateGroup={vi.fn()}
      onOpenGroupDetail={vi.fn()}
    />,
  );
}

function authenticate() {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    user: {
      id: "learner-1",
      full_name: "Sari Putri",
      role: "student",
      skills: [
        {
          skill_id: "skill-1",
          skill_type: "learning",
          skill: { name: "Struktur Data" },
        },
      ],
    },
  });
}

afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, user: null });
  vi.mocked(groupApi.list).mockResolvedValue({ success: true, data: [] });
  vi.mocked(groupApi.getRecommendations).mockResolvedValue({
    success: true,
    data: [],
  });
  vi.mocked(systemApi.getHealth).mockResolvedValue({ success: false });
});

describe("catalog loading and recovery", () => {
  it("shows a retryable error instead of empty results after a network failure", async () => {
    vi.mocked(groupApi.list).mockRejectedValue(new Error("Network Error"));
    renderHome();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(catalogError)).toBeTruthy();
    expect(
      within(alert).getByRole("button", { name: "Coba lagi" }),
    ).toBeTruthy();
    expect(screen.queryByText(catalogEmpty)).toBeNull();
  });

  it("treats an unsuccessful API response as failure, not an empty catalog", async () => {
    vi.mocked(groupApi.list).mockResolvedValue({
      success: false,
      error: { code: "UNAVAILABLE" },
    });
    renderHome();

    expect(await screen.findByText(catalogError)).toBeTruthy();
    expect(screen.queryByText(catalogEmpty)).toBeNull();
  });

  it("shows true-empty results only after a successful request", async () => {
    renderHome();

    expect(await screen.findByText(catalogEmpty)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("recovers on retry without losing the selected category", async () => {
    const user = userEvent.setup();
    renderHome();
    await screen.findByText(catalogEmpty);
    vi.mocked(groupApi.list).mockRejectedValueOnce(new Error("Offline"));
    await user.click(
      screen.getByRole("button", { name: "Teknologi", exact: true }),
    );
    await screen.findByText(catalogError);
    vi.mocked(groupApi.list).mockResolvedValueOnce({
      success: true,
      data: [group],
    });

    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(
      await screen.findByRole("heading", { name: group.title }),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(groupApi.list).toHaveBeenLastCalledWith({
      category: "Teknologi",
      format: undefined,
      search: undefined,
    });
  });

  it("disables retry until the pending request finishes", async () => {
    const user = userEvent.setup();
    vi.mocked(groupApi.list).mockRejectedValueOnce(new Error("Offline"));
    renderHome();
    await screen.findByText(catalogError);
    const request = deferred();
    vi.mocked(groupApi.list).mockReturnValueOnce(request.promise);

    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    const retry = screen.getByRole("button", { name: "Mencoba lagi…" });
    expect(retry.disabled).toBe(true);
    await user.click(retry);
    expect(groupApi.list).toHaveBeenCalledTimes(2);
    await act(async () => request.resolve({ success: true, data: [] }));
    expect(await screen.findByText(catalogEmpty)).toBeTruthy();
  });

  it("keeps loaded sessions visible during a failed refresh with a stale-data explanation", async () => {
    const user = userEvent.setup();
    vi.mocked(groupApi.list).mockResolvedValueOnce({
      success: true,
      data: [group],
    });
    renderHome();
    await screen.findByRole("heading", { name: group.title });
    const request = deferred();
    vi.mocked(groupApi.list).mockReturnValueOnce(request.promise);

    await user.click(
      screen.getByRole("button", { name: "Daring", exact: true }),
    );
    expect(screen.getByRole("heading", { name: group.title })).toBeTruthy();
    await act(async () => request.resolve({ success: false }));
    expect(await screen.findByText(catalogError)).toBeTruthy();
    expect(screen.getByRole("heading", { name: group.title })).toBeTruthy();
    expect(
      screen.getByText(/Menampilkan data terakhir yang berhasil dimuat/),
    ).toBeTruthy();
    expect(screen.queryByText(catalogEmpty)).toBeNull();
  });

  it("ignores obsolete results after a newer category succeeds", async () => {
    const user = userEvent.setup();
    const oldRequest = deferred();
    vi.mocked(groupApi.list).mockReturnValueOnce(oldRequest.promise);
    renderHome();
    vi.mocked(groupApi.list).mockResolvedValueOnce({
      success: true,
      data: [group],
    });
    await user.click(
      screen.getByRole("button", { name: "Teknologi", exact: true }),
    );
    await screen.findByRole("heading", { name: group.title });

    await act(async () =>
      oldRequest.resolve({
        success: true,
        data: [{ ...group, id: "obsolete", title: "Hasil kategori lama" }],
      }),
    );

    expect(screen.getByRole("heading", { name: group.title })).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Hasil kategori lama" }),
    ).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("recommendation loading and recovery", () => {
  it("does not call failed recommendations an empty match", async () => {
    const user = userEvent.setup();
    authenticate();
    vi.mocked(groupApi.getRecommendations).mockRejectedValue(
      new Error("Offline"),
    );
    renderHome();
    await user.click(
      screen.getByRole("button", { name: /Direkomendasikan Untuk Anda/ }),
    );

    expect(await screen.findByText(recError)).toBeTruthy();
    expect(screen.queryByText("Belum Ada Sesi yang Cocok")).toBeNull();
  });

  it("handles success:false even when no learning interests are configured", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { id: "learner-1", skills: [] },
    });
    vi.mocked(groupApi.getRecommendations).mockResolvedValue({
      success: false,
    });
    renderHome();
    await user.click(
      screen.getByRole("button", { name: /Direkomendasikan Untuk Anda/ }),
    );

    expect(await screen.findByText(recError)).toBeTruthy();
    expect(
      screen.queryByText("Belum Ada Minat Belajar yang Ditentukan"),
    ).toBeNull();
  });

  it("shows an empty match after a successful empty recommendation response", async () => {
    const user = userEvent.setup();
    authenticate();
    renderHome();
    await user.click(
      screen.getByRole("button", { name: /Direkomendasikan Untuk Anda/ }),
    );

    expect(await screen.findByText("Belum Ada Sesi yang Cocok")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("recovers failed recommendations with a retry", async () => {
    const user = userEvent.setup();
    authenticate();
    vi.mocked(groupApi.getRecommendations).mockRejectedValue(
      new Error("Offline"),
    );
    renderHome();
    await user.click(
      screen.getByRole("button", { name: /Direkomendasikan Untuk Anda/ }),
    );
    await screen.findByText(recError);
    vi.mocked(groupApi.getRecommendations).mockResolvedValueOnce({
      success: true,
      data: [group],
    });

    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(
      await screen.findByRole("heading", { name: group.title }),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("preserves previous recommendations during refresh and subsequent failure", async () => {
    const user = userEvent.setup();
    authenticate();
    vi.mocked(groupApi.getRecommendations).mockResolvedValue({
      success: true,
      data: [group],
    });
    renderHome();
    await waitFor(() => expect(groupApi.getRecommendations).toHaveBeenCalled());
    await user.click(
      screen.getByRole("button", { name: /Direkomendasikan Untuk Anda/ }),
    );
    await screen.findByRole("heading", { name: group.title });
    const request = deferred();
    vi.mocked(groupApi.getRecommendations).mockReturnValueOnce(request.promise);

    await user.click(
      screen.getByRole("button", { name: /Direkomendasikan Untuk Anda/ }),
    );
    expect(screen.getByRole("heading", { name: group.title })).toBeTruthy();
    await act(async () => request.resolve({ success: false }));
    expect(await screen.findByText(recError)).toBeTruthy();
    expect(screen.getByRole("heading", { name: group.title })).toBeTruthy();
    expect(
      screen.getByText(/Menampilkan data terakhir yang berhasil dimuat/),
    ).toBeTruthy();
  });
});
