// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainLayout } from "./MainLayout";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
  });
});

describe("MainLayout navigation", () => {
  it.each([
    ["Masuk", "login"],
    ["Daftar", "register"],
  ])("opens %s with the requested authentication mode", async (label, mode) => {
    const user = userEvent.setup();
    const onOpenAuth = vi.fn();
    render(<MainLayout onOpenAuth={onOpenAuth}>Katalog sesi</MainLayout>);

    await user.click(screen.getByRole("button", { name: label }));

    expect(onOpenAuth).toHaveBeenCalledExactlyOnceWith(mode);
  });

  it.each([
    ["Buka Sesi", "onOpenCreateGroup"],
    ["Sesi Saya", "onOpenMySessions"],
    ["Keahlian", "onOpenSkills"],
    ["Budi Santoso", "onOpenProfile"],
  ])("opens %s for an authenticated user", async (label, callback) => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        full_name: "Budi Santoso",
        role: "student",
        campus_name: "Kampus Budi",
      },
      isAuthenticated: true,
      logout: vi.fn(),
    });
    const onOpen = vi.fn();
    render(<MainLayout {...{ [callback]: onOpen }}>Katalog sesi</MainLayout>);

    const navigation = screen.getByRole("navigation", {
      name: "Navigasi akun",
    });
    await user.click(
      within(navigation).getByRole("button", { name: new RegExp(label) }),
    );

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["Sesi Saya", "onOpenMySessions"],
    ["Buka Sesi", "onOpenCreateGroup"],
    ["Keahlian", "onOpenSkills"],
  ])("opens %s from mobile navigation", async (label, callback) => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        full_name: "Budi Santoso",
        role: "student",
        campus_name: "Kampus Budi",
      },
      isAuthenticated: true,
      logout: vi.fn(),
    });
    const onOpen = vi.fn();
    render(<MainLayout {...{ [callback]: onOpen }}>Katalog sesi</MainLayout>);

    const navigation = screen.getByRole("navigation", {
      name: "Navigasi seluler",
    });
    await user.click(within(navigation).getByRole("button", { name: label }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("supports keyboard activation in mobile navigation", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        full_name: "Budi Santoso",
        role: "student",
        campus_name: "Kampus Budi",
      },
      isAuthenticated: true,
      logout: vi.fn(),
    });
    const onOpenMySessions = vi.fn();
    const onOpenCreateGroup = vi.fn();
    render(
      <MainLayout
        onOpenMySessions={onOpenMySessions}
        onOpenCreateGroup={onOpenCreateGroup}
      >
        Katalog sesi
      </MainLayout>,
    );
    const navigation = screen.getByRole("navigation", {
      name: "Navigasi seluler",
    });
    within(navigation).getByRole("button", { name: "Sesi Saya" }).focus();

    await user.keyboard("{Enter}");
    expect(onOpenMySessions).toHaveBeenCalledTimes(1);

    await user.tab();
    expect(document.activeElement).toBe(
      within(navigation).getByRole("button", { name: "Buka Sesi" }),
    );
    await user.keyboard(" ");
    expect(onOpenCreateGroup).toHaveBeenCalledTimes(1);
  });

  it("does not show authenticated mobile navigation to guests", () => {
    render(<MainLayout>Katalog sesi</MainLayout>);

    expect(
      screen.queryByRole("navigation", { name: "Navigasi seluler" }),
    ).toBeNull();
  });

  it("keeps page content inside the main landmark", () => {
    render(
      <MainLayout>
        <h1>Jelajahi sesi</h1>
      </MainLayout>,
    );

    expect(
      within(screen.getByRole("main")).getByRole("heading", {
        name: "Jelajahi sesi",
      }),
    ).toBeTruthy();
  });

  it("renders a skip to content link targeted at the main landmark", () => {
    render(<MainLayout>Katalog sesi</MainLayout>);

    const skipLink = screen.getByRole("link", {
      name: /lewati ke konten utama/i,
    });
    expect(skipLink).toBeTruthy();
    expect(skipLink.getAttribute("href")).toBe("#main-content");
    expect(screen.getByRole("main").getAttribute("id")).toBe("main-content");
  });
});
