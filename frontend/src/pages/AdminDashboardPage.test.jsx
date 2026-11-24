// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import {
  authApi,
  engagementApi,
  groupApi,
  supportApi,
  systemApi,
} from "../api/client";

const adminUser = {
  id: "admin-1",
  full_name: "Admin Akademik FST",
  email: "admin.fst@uinsgd.ac.id",
  role: "admin",
  campus_name: "UIN SGD Bandung - Dekanat FST",
};

const pendingSession = {
  id: "grp-pending-1",
  host_id: "student-1",
  title: "Responsi Basis Data Normalisasi 3NF",
  description: "Latihan perancangan skema PostgreSQL.",
  category: "Teknologi",
  format: "offline",
  location_or_link: "Gedung FST Kampus 1 Cipadung",
  building_details: "Lab Komputer Lt. 3",
  agenda: ["Review 1NF-3NF", "Latihan Join"],
  prerequisites: "Membawa laptop",
  start_time: "2026-11-22T09:00:00Z",
  end_time: "2026-11-22T11:00:00Z",
  max_capacity: 12,
  current_members: 0,
  status: "pending_approval",
  host: {
    id: "student-1",
    full_name: "Nabila Azzahra",
    email: "nabila@uinsgd.ac.id",
    campus_name: "S1 Teknik Informatika",
    contribution_points: 42,
    account_status: "active",
  },
};

const supportThread = {
  id: "thread-1",
  student_id: "student-1",
  subject: "Verifikasi Peminjaman Labkom",
  status: "open",
  last_message_at: "2026-11-18T08:30:00Z",
  message_count: 2,
  last_message: "Apakah sesi sudah bisa di-ACC?",
  last_sender_name: "Nabila Azzahra",
  last_sender_role: "student",
  student: {
    id: "student-1",
    full_name: "Nabila Azzahra",
    email: "nabila@uinsgd.ac.id",
    campus_name: "S1 Teknik Informatika",
    role: "student",
    account_status: "active",
  },
  messages: [
    {
      id: "msg-1",
      thread_id: "thread-1",
      sender_id: "student-1",
      message: "Assalamualaikum Admin, mohon cek pengajuan lab.",
      created_at: "2026-11-18T08:00:00Z",
      sender: { id: "student-1", full_name: "Nabila Azzahra", role: "student" },
    },
    {
      id: "msg-2",
      thread_id: "thread-1",
      sender_id: "admin-2",
      message: "Sedang kami cek jadwal ruangannya ya.",
      created_at: "2026-11-18T08:15:00Z",
      sender: {
        id: "admin-2",
        full_name: "Koordinator Kemahasiswaan FST",
        role: "admin",
      },
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("peerlearn_token", "admin-token");
  vi.spyOn(authApi, "getMe").mockResolvedValue({
    success: true,
    data: adminUser,
  });
  vi.spyOn(systemApi, "getHealth").mockResolvedValue({ status: "healthy" });
  vi.spyOn(groupApi, "adminList").mockResolvedValue({
    success: true,
    data: [pendingSession],
  });
  vi.spyOn(groupApi, "adminReview").mockResolvedValue({
    success: true,
    data: { ...pendingSession, status: "open" },
  });
  vi.spyOn(engagementApi, "listModeration").mockResolvedValue({
    success: true,
    data: [],
  });
  vi.spyOn(supportApi, "adminListThreads").mockResolvedValue({
    success: true,
    data: [supportThread],
  });
  vi.spyOn(supportApi, "adminGetMessages").mockResolvedValue({
    success: true,
    data: supportThread,
  });
  vi.spyOn(supportApi, "adminReply").mockResolvedValue({
    success: true,
    data: {
      id: "msg-3",
      thread_id: "thread-1",
      sender_id: "admin-1",
      message: "Sudah saya ACC sekarang.",
      created_at: "2026-11-18T09:00:00Z",
      sender: { id: "admin-1", full_name: "Admin Akademik FST", role: "admin" },
    },
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Admin dedicated workspace", () => {
  it("routes admin login to dedicated workspace, validates rejection note, and approves session", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "Antrean Verifikasi & Kurasi Sesi Belajar",
      })
    ).toBeTruthy();

    expect(
      screen.queryByRole("heading", { name: "Jelajahi Sesi Belajar Komunitas" })
    ).toBeNull();

    await screen.findByRole("heading", { name: pendingSession.title });

    await user.click(
      screen.getByRole("button", { name: "Tolak & Minta Revisi" })
    );
    expect(screen.getByRole("alert").textContent).toMatch(/alasan penolakan/i);
    expect(groupApi.adminReview).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText(/Catatan Kurasi Admin/),
      "Agenda dan lokasi terverifikasi."
    );
    await user.click(
      screen.getByRole("button", { name: "ACC & Tayangkan Sesi" })
    );

    await waitFor(() =>
      expect(groupApi.adminReview).toHaveBeenCalledWith(pendingSession.id, {
        action: "approve",
        note: "Agenda dan lokasi terverifikasi.",
      })
    );
  });

  it("displays shared admin inbox with multi-admin labels and sends reply", async () => {
    const user = userEvent.setup();
    render(<App />);

    const sidebar = await screen.findByRole("complementary", {
      name: "Navigasi ruang admin",
    });
    await user.click(
      within(sidebar).getByRole("button", { name: /Pesan Mahasiswa/ })
    );

    expect(
      await screen.findByRole("heading", {
        name: "Kotak Masuk Bantuan Mahasiswa (Shared Inbox)",
      })
    ).toBeTruthy();

    expect(await screen.findByText("Koordinator Kemahasiswaan FST")).toBeTruthy();
    expect(
      screen.getByText("Sedang kami cek jadwal ruangannya ya.")
    ).toBeTruthy();

    await user.type(
      screen.getByLabelText("Balas pesan mahasiswa"),
      "Sudah saya ACC sekarang."
    );
    await user.click(screen.getByRole("button", { name: "Kirim" }));

    await waitFor(() =>
      expect(supportApi.adminReply).toHaveBeenCalledWith("thread-1", {
        message: "Sudah saya ACC sekarang.",
      })
    );
    expect(await screen.findByText("Sudah saya ACC sekarang.")).toBeTruthy();
  });

  it("navigates from overview Periksa Detail directly to approvals with that pending session selected", async () => {
    const secondPending = {
      ...pendingSession,
      id: "grp-pending-2",
      title: "Klinik Riset Hadis & Takhrij Digital",
      category: "Ushuluddin & Studi Islam",
    };
    groupApi.adminList.mockResolvedValue({
      success: true,
      data: [pendingSession, secondPending],
    });

    const user = userEvent.setup();
    render(<App />);

    const sidebar = await screen.findByRole("complementary", {
      name: "Navigasi ruang admin",
    });
    await user.click(
      within(sidebar).getByRole("button", { name: /Ringkasan/ })
    );

    expect(
      await screen.findByRole("heading", {
        name: "Ringkasan Operasional Komunitas UIN SGD",
      })
    ).toBeTruthy();

    const detailButtons = await screen.findAllByRole("button", {
      name: "Periksa Detail",
    });
    await user.click(detailButtons[1]);

    expect(
      await screen.findByRole("heading", {
        name: "Antrean Verifikasi & Kurasi Sesi Belajar",
      })
    ).toBeTruthy();
    expect(
      await screen.findByRole("heading", { name: secondPending.title })
    ).toBeTruthy();
  });
});
