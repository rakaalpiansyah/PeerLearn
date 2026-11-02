// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import {
  authApi,
  groupApi,
  membershipApi,
  systemApi,
  userApi,
} from "./api/client";

const skills = [
  {
    skill_id: "skill-1",
    skill_type: "learning",
    skill: { name: "Struktur Data" },
  },
];
const accountA = {
  id: "user-a",
  full_name: "Sari Putri",
  role: "student",
  skills,
};
const accountB = {
  id: "user-b",
  full_name: "Budi Santoso",
  role: "student",
  skills,
};
const groupA = {
  id: "session-a",
  title: "Sesi milik akun pertama",
  description: "Latihan bersama rekan kampus.",
  category: "Teknologi",
  format: "online",
  location_or_link: "https://example.com/meeting",
  status: "open",
  user_membership: "accepted",
  start_time: "2026-11-05T09:00:00Z",
  end_time: "2026-11-05T10:00:00Z",
  max_capacity: 8,
  current_members: 2,
  host: { full_name: "Tutor Sari", contribution_points: 10 },
};

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function logout(user) {
  for (const dialog of screen.queryAllByRole("dialog").reverse()) {
    await user.click(
      within(dialog).getByRole("button", { name: "Tutup dialog" }),
    );
  }
  await user.click(
    within(screen.getByRole("navigation", { name: "Navigasi akun" })).getByRole(
      "button",
      { name: "Keluar" },
    ),
  );
}

async function loginAsB(user) {
  const nav = screen.getByRole("navigation", { name: "Navigasi akun" });
  await user.click(
    within(nav).getByRole("button", { name: "Masuk", exact: true }),
  );
  const dialog = screen.getByRole("dialog", { name: "Masuk ke PeerLearn" });
  await user.type(
    within(dialog).getByLabelText(/Alamat Email/),
    "budi@example.com",
  );
  await user.type(within(dialog).getByLabelText(/Kata Sandi/), "password123");
  await user.click(
    within(dialog).getByRole("button", { name: "Masuk ke Akun" }),
  );
  await screen.findByRole("button", { name: "Profil Budi Santoso" });
}

async function openSessions(user) {
  const nav = screen.getByRole("navigation", { name: "Navigasi akun" });
  await user.click(within(nav).getByRole("button", { name: "Sesi Saya" }));
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("peerlearn_token", "token-a");
  vi.spyOn(authApi, "getMe").mockImplementation(async () => ({
    success: true,
    data:
      localStorage.getItem("peerlearn_token") === "token-b"
        ? accountB
        : accountA,
  }));
  vi.spyOn(authApi, "login").mockResolvedValue({
    success: true,
    data: { user: accountB, token: "token-b" },
  });
  vi.spyOn(systemApi, "getHealth").mockResolvedValue({ success: false });
  vi.spyOn(groupApi, "list").mockResolvedValue({ success: true, data: [] });
  vi.spyOn(groupApi, "getMembers").mockResolvedValue({
    success: true,
    data: [],
  });
  vi.spyOn(groupApi, "getFeedbacks").mockResolvedValue({
    success: true,
    data: [],
  });
  vi.spyOn(groupApi, "getRecommendations").mockImplementation(async () => {
    if (localStorage.getItem("peerlearn_token") !== "token-a")
      throw new Error("Offline");
    return { success: true, data: [groupA] };
  });
  vi.spyOn(membershipApi, "getMySessions").mockImplementation(async () => {
    if (localStorage.getItem("peerlearn_token") !== "token-a")
      throw new Error("Offline");
    return { success: true, data: { joined: [groupA], hosted: [] } };
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("stacked modal navigation", () => {
  it("opens login above detail and returns focus through both launchers on cancel", async () => {
    localStorage.clear();
    groupApi.list.mockResolvedValue({
      success: true,
      data: [{ ...groupA, user_membership: null }],
    });
    const user = userEvent.setup();
    render(<App />);
    const launcher = await screen.findByRole("button", {
      name: `Lihat sesi ${groupA.title}`,
    });
    await user.click(launcher);
    const detail = await screen.findByRole("dialog", { name: groupA.title });
    const join = within(detail).getByRole("button", {
      name: "Minta Bergabung",
    });
    await user.click(join);
    const login = screen.getByRole("dialog", { name: "Masuk ke PeerLearn" });
    expect(login.tagName).toBe("DIALOG");
    expect(login.contains(document.activeElement)).toBe(true);
    fireEvent(login, new Event("cancel", { cancelable: true }));
    expect(
      screen.queryByRole("dialog", { name: "Masuk ke PeerLearn" }),
    ).toBeNull();
    expect(screen.getByRole("dialog", { name: groupA.title })).toBe(detail);
    expect(document.activeElement).toBe(join);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent(detail, new Event("cancel", { cancelable: true }));
    expect(document.activeElement).toBe(launcher);
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it.each([
    ["Laporkan", "Laporkan Sesi Belajar"],
    ["Beri Rating Tutor", "Ulasan & Apresiasi Tutor"],
  ])(
    "closes only the upper %s dialog and restores focus to detail",
    async (action, name) => {
      groupApi.list.mockResolvedValue({
        success: true,
        data: [{ ...groupA, status: "completed" }],
      });
      const user = userEvent.setup();
      render(<App />);
      await screen.findByRole("button", { name: "Profil Sari Putri" });
      await user.click(
        await screen.findByRole("button", {
          name: `Lihat sesi ${groupA.title}`,
        }),
      );
      const detail = screen.getByRole("dialog", { name: groupA.title });
      const opener = within(detail).getByRole("button", { name: action });
      await user.click(opener);
      const upper = screen.getByRole("dialog", { name });
      fireEvent(upper, new Event("cancel", { cancelable: true }));
      expect(screen.queryByRole("dialog", { name })).toBeNull();
      expect(screen.getByRole("dialog", { name: groupA.title })).toBe(detail);
      expect(document.activeElement).toBe(opener);
    },
  );

  it("replaces the session list with detail without stealing its focus", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "Profil Sari Putri" });
    await openSessions(user);
    await user.click(
      await screen.findByRole("button", { name: `Lihat sesi ${groupA.title}` }),
    );
    const detail = screen.getByRole("dialog", { name: groupA.title });
    expect(
      screen.queryByRole("dialog", { name: "Sesi Belajar Saya" }),
    ).toBeNull();
    expect(detail.contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent(detail, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.activeElement.tagName).not.toBe("BODY");
  });
});

describe("session verification recovery", () => {
  it("retains the account and open form after a background profile refresh fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(userApi, "getSkills").mockResolvedValue({
      success: true,
      data: [],
    });
    vi.spyOn(userApi, "updateSkills").mockResolvedValue({ success: true });
    render(<App />);
    await screen.findByRole("button", { name: "Profil Sari Putri" });
    const nav = screen.getByRole("navigation", { name: "Navigasi akun" });
    await user.click(within(nav).getByRole("button", { name: /Keahlian/ }));
    const dialog = await screen.findByRole("dialog", {
      name: "Kelola Minat & Keahlian Belajar",
    });
    authApi.getMe.mockRejectedValueOnce({
      status: 503,
      message: "Profil sedang tidak tersedia",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Simpan Perubahan" }),
    );
    await screen.findByText("Profil Anda belum dapat dimuat.");
    expect(
      screen.getByRole("button", { name: "Profil Sari Putri" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("dialog", { name: "Kelola Minat & Keahlian Belajar" }),
    ).toBe(dialog);
    expect(
      within(dialog).getByText("Profil sedang tidak tersedia"),
    ).toBeTruthy();
    expect(localStorage.getItem("peerlearn_token")).toBe("token-a");
  });
  it("shows verification loading without guest or private actions", () => {
    authApi.getMe.mockReturnValueOnce(deferred().promise);
    render(<App />);
    expect(screen.getByRole("status", { name: "Memeriksa sesi" })).toBeTruthy();
    expect(
      screen.queryByRole("navigation", { name: "Navigasi akun" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Sesi Saya" })).toBeNull();
  });

  it("retains the token, disables pending retry, then recovers the account", async () => {
    const user = userEvent.setup();
    const retry = deferred();
    authApi.getMe
      .mockRejectedValueOnce({ status: 503 })
      .mockReturnValueOnce(retry.promise);
    render(<App />);
    await screen.findByText("Profil Anda belum dapat dimuat.");
    expect(localStorage.getItem("peerlearn_token")).toBe("token-a");
    expect(
      screen.queryByRole("navigation", { name: "Navigasi akun" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(screen.getByRole("button", { name: "Mencoba lagi…" }).disabled).toBe(
      true,
    );
    await act(async () => retry.resolve({ success: true, data: accountA }));
    expect(
      await screen.findByRole("button", { name: "Profil Sari Putri" }),
    ).toBeTruthy();
    expect(screen.queryByText("Profil Anda belum dapat dimuat.")).toBeNull();
  });

  it("lets the user explicitly discard an unavailable session", async () => {
    const user = userEvent.setup();
    authApi.getMe.mockRejectedValueOnce({ code: "NETWORK_ERROR" });
    render(<App />);
    await screen.findByText("Profil Anda belum dapat dimuat.");
    await user.click(screen.getByRole("button", { name: "Gunakan akun lain" }));
    expect(localStorage.getItem("peerlearn_token")).toBeNull();
    const nav = await screen.findByRole("navigation", {
      name: "Navigasi akun",
    });
    expect(
      within(nav).getByRole("button", { name: "Masuk", exact: true }),
    ).toBeTruthy();
  });
});

describe("account-scoped retained data", () => {
  it("clears visible recommendations immediately on logout", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "Profil Sari Putri" });
    await user.click(
      screen.getByRole("button", { name: /Direkomendasikan Untuk Anda/ }),
    );
    await screen.findByRole("heading", { name: groupA.title });

    await logout(user);

    expect(screen.queryByRole("heading", { name: groupA.title })).toBeNull();
  });

  it("does not retain the first account recommendations when the next account fails to load", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "Profil Sari Putri" });
    await user.click(
      screen.getByRole("button", { name: /Direkomendasikan Untuk Anda/ }),
    );
    await screen.findByRole("heading", { name: groupA.title });
    await logout(user);
    await loginAsB(user);
    await user.click(
      screen.getByRole("button", { name: /Direkomendasikan Untuk Anda/ }),
    );
    await screen.findByText("Rekomendasi belum dapat dimuat.");

    expect(screen.queryByRole("heading", { name: groupA.title })).toBeNull();
    expect(
      screen.queryByText(/Menampilkan data terakhir yang berhasil dimuat/),
    ).toBeNull();
  });

  it("does not reuse the first account session list after another account logs in", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "Profil Sari Putri" });
    await openSessions(user);
    await screen.findByRole("heading", { name: groupA.title });
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getAllByRole("button")[0]);
    await logout(user);
    await loginAsB(user);
    await openSessions(user);
    await screen.findByText("Sesi Anda belum dapat dimuat.");

    expect(screen.queryByRole("heading", { name: groupA.title })).toBeNull();
    expect(
      screen.queryByText(/Menampilkan data terakhir yang berhasil dimuat/),
    ).toBeNull();
  });

  it("discards the previous account in-flight session response after logout", async () => {
    const user = userEvent.setup();
    const request = deferred();
    membershipApi.getMySessions.mockReturnValueOnce(request.promise);
    render(<App />);
    await screen.findByRole("button", { name: "Profil Sari Putri" });
    await openSessions(user);
    await logout(user);
    await loginAsB(user);
    await openSessions(user);
    await act(async () =>
      request.resolve({
        success: true,
        data: { joined: [groupA], hosted: [] },
      }),
    );

    expect(screen.queryByRole("heading", { name: groupA.title })).toBeNull();
    expect(
      await screen.findByText("Sesi Anda belum dapat dimuat."),
    ).toBeTruthy();
  });
});
