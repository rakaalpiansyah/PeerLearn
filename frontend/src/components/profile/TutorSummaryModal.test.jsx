// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { TutorSummaryModal } from "./TutorSummaryModal";
import { AuthProvider } from "../../context/AuthContext";
import { authApi, membershipApi } from "../../api/client";

const studentUser = {
  id: "student-1",
  full_name: "Ahmad Fauzi",
  email: "ahmad@student.uinsgd.ac.id",
  role: "student",
  campus_name: "UIN SGD Bandung - FST S1 Teknik Informatika",
  contribution_points: 5,
  skills: [
    {
      skill_id: "sk-1",
      skill_type: "mastered",
      skill: { id: "sk-1", name: "Basis Data Lanjut" },
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("peerlearn_token", "test-token");
  vi.spyOn(authApi, "getMe").mockResolvedValue({
    success: true,
    data: studentUser,
  });
  vi.spyOn(membershipApi, "getMySessions").mockResolvedValue({
    success: true,
    data: {
      hosted: [
        {
          id: "grp-host-1",
          title: "Klinik PostgreSQL Index",
          category: "Teknologi",
          status: "completed",
          start_time: "2026-11-20T09:00:00Z",
          attended_count: 4,
        },
        {
          id: "grp-host-open",
          title: "Sesi Masih Terbuka",
          category: "Teknologi",
          status: "open",
          start_time: "2026-11-28T09:00:00Z",
          attended_count: 0,
        },
      ],
      joined: [
        {
          id: "grp-join-1",
          title: "Studi Fiqh Muamalah Kontemporer",
          category: "Hukum & Syariah",
          status: "completed",
          user_membership: "attended",
          start_time: "2026-11-18T13:00:00Z",
        },
      ],
    },
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("TutorSummaryModal verified SKPI transcript", () => {
  it("loads verified hosted completed sessions and attended joined sessions into SKPI transcript", async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TutorSummaryModal isOpen onClose={vi.fn()} />
        </AuthProvider>
      );
    });

    const dialog = await screen.findByRole("dialog", {
      name: /Surat Keterangan Kontribusi Tutor/,
    });

    expect(
      await within(dialog).findByText("Klinik PostgreSQL Index")
    ).toBeTruthy();
    expect(
      within(dialog).getByText("Studi Fiqh Muamalah Kontemporer")
    ).toBeTruthy();
    expect(within(dialog).queryByText("Sesi Masih Terbuka")).toBeNull();
    expect(within(dialog).getByText(/4 hadir/)).toBeTruthy();
    expect(within(dialog).getByText("Peserta Hadir")).toBeTruthy();
    expect(
      within(dialog).getByRole("button", { name: /Cetak \/ Simpan PDF/ }).disabled
    ).toBe(false);
    expect(
      within(dialog).getByText(
        `${window.location.origin}/verifikasi-skpi/student-1`
      )
    ).toBeTruthy();
    expect(
      within(dialog).getByRole("img", { name: /QR Code Verifikasi SKPI PeerLearn/ })
    ).toBeTruthy();
    expect(within(dialog).getByText("Pindai Verifikasi SKPI")).toBeTruthy();
  });

  it("disables printing with honest notice when user has 0 points and 0 verified sessions", async () => {
    authApi.getMe.mockResolvedValueOnce({
      success: true,
      data: { ...studentUser, contribution_points: 0 },
    });
    membershipApi.getMySessions.mockResolvedValueOnce({
      success: true,
      data: { hosted: [], joined: [] },
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TutorSummaryModal isOpen onClose={vi.fn()} />
        </AuthProvider>
      );
    });

    const dialog = await screen.findByRole("dialog", {
      name: /Surat Keterangan Kontribusi Tutor/,
    });
    expect(
      await within(dialog).findByText(
        /Belum ada sesi selesai atau kehadiran terverifikasi/
      )
    ).toBeTruthy();
    expect(
      within(dialog).getByRole("button", { name: /Cetak \/ Simpan PDF/ }).disabled
    ).toBe(true);
  });
});
