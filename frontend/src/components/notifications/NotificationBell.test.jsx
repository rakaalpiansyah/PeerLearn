// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "./NotificationBell";
import { notificationApi } from "../../api/client";

const sampleNotifications = [
  {
    id: "notif-1",
    type: "membership_accepted",
    title: "Permintaan Bergabung Disetujui",
    message: "Anda disetujui masuk ke sesi Struktur Data.",
    related_group_id: "grp-1",
    is_read: false,
    created_at: "2026-11-24T08:00:00Z",
  },
  {
    id: "notif-2",
    type: "support_reply",
    title: "Balasan Baru dari Tim Admin",
    message: "Admin sudah memeriksa pengajuan SKPI Anda.",
    related_group_id: null,
    is_read: true,
    created_at: "2026-11-24T07:00:00Z",
  },
];

beforeEach(() => {
  vi.spyOn(notificationApi, "list").mockResolvedValue({
    success: true,
    data: {
      notifications: sampleNotifications,
      unread_count: 1,
    },
  });
  vi.spyOn(notificationApi, "markRead").mockResolvedValue({ success: true });
  vi.spyOn(notificationApi, "markAllRead").mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("NotificationBell", () => {
  it("loads unread badge, opens popover, marks item read, and routes to session", async () => {
    const user = userEvent.setup();
    const onOpenGroupById = vi.fn();
    const onOpenSupport = vi.fn();

    render(
      <NotificationBell
        onOpenGroupById={onOpenGroupById}
        onOpenSupport={onOpenSupport}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("1")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Notifikasi" }));
    const region = await screen.findByRole("region", {
      name: "Daftar notifikasi",
    });
    expect(within(region).getByText("Permintaan Bergabung Disetujui")).toBeTruthy();

    await user.click(
      within(region).getByRole("button", {
        name: /Permintaan Bergabung Disetujui/,
      })
    );

    expect(notificationApi.markRead).toHaveBeenCalledWith("notif-1");
    expect(onOpenGroupById).toHaveBeenCalledWith("grp-1");
    expect(onOpenSupport).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Daftar notifikasi" })).toBeNull();
  });

  it("marks all notifications read and routes support notifications", async () => {
    const user = userEvent.setup();
    const onOpenGroupById = vi.fn();
    const onOpenSupport = vi.fn();

    render(
      <NotificationBell
        onOpenGroupById={onOpenGroupById}
        onOpenSupport={onOpenSupport}
      />
    );

    await waitFor(() => expect(screen.getByText("1")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Notifikasi" }));

    const region = await screen.findByRole("region", {
      name: "Daftar notifikasi",
    });
    await user.click(
      within(region).getByRole("button", { name: /Tandai semua dibaca/ })
    );

    expect(notificationApi.markAllRead).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(
        within(region).queryByRole("button", { name: /Tandai semua dibaca/ })
      ).toBeNull();
    });

    await user.click(
      within(region).getByRole("button", { name: /Balasan Baru dari Tim Admin/ })
    );
    expect(onOpenSupport).toHaveBeenCalledTimes(1);
  });

  it("shows empty and retryable error states inside the popover without throwing", async () => {
    const user = userEvent.setup();
    notificationApi.list.mockRejectedValue(new Error("Server gangguan"));

    render(<NotificationBell onOpenGroupById={vi.fn()} onOpenSupport={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Notifikasi" }));
    expect(await screen.findByText("Server gangguan")).toBeTruthy();

    notificationApi.list.mockResolvedValueOnce({
      success: true,
      data: { notifications: [], unread_count: 0 },
    });
    await user.click(screen.getByRole("button", { name: /Muat Ulang/ }));

    expect(
      await screen.findByText("Belum ada notifikasi baru.")
    ).toBeTruthy();
  });
});
