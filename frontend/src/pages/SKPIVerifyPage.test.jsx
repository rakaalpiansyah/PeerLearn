// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SKPIVerifyPage } from "./SKPIVerifyPage";
import { userApi } from "../api/client";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SKPIVerifyPage", () => {
  it("renders verified SKPI record, skills, and session transcript for a valid student", async () => {
    vi.spyOn(userApi, "verifySKPI").mockResolvedValue({
      success: true,
      data: {
        user_id: "b0000000-0000-0000-0000-000000000001",
        full_name: "Nabila Azzahra",
        campus_name: "UIN SGD Bandung - S1 Teknik Informatika",
        contribution_points: 42,
        mastered_skills: ["Basis Data PostgreSQL", "Algoritma & Struktur Data"],
        verified_hosted_count: 1,
        verified_attended_count: 0,
        completed_sessions: [
          {
            group_id: "c0000000-0000-0000-0000-000000000014",
            title: "Responsi Struktur Data",
            category: "Teknologi",
            role: "tutor",
            start_time: "2026-11-17T09:00:00Z",
            attended_count: 3,
          },
        ],
        verification_code: "PL-B0000000000000000000000000000001",
        verified: true,
      },
    });

    const user = userEvent.setup();
    const onBackHome = vi.fn();

    render(
      <SKPIVerifyPage
        userId="b0000000-0000-0000-0000-000000000001"
        onBackHome={onBackHome}
      />
    );

    expect(await screen.findByText("Terverifikasi Resmi")).toBeTruthy();
    expect(screen.getByText("Nabila Azzahra")).toBeTruthy();
    expect(screen.getByText("Basis Data PostgreSQL")).toBeTruthy();
    expect(screen.getByText("Responsi Struktur Data")).toBeTruthy();
    expect(screen.getByText("Tutor (3 hadir)")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Kembali ke Katalog PeerLearn" })
    );
    expect(onBackHome).toHaveBeenCalledTimes(1);
  });

  it("shows recoverable error state when SKPI ID is not found", async () => {
    vi.spyOn(userApi, "verifySKPI").mockRejectedValue({
      message: "Data verifikasi SKPI tidak ditemukan",
    });

    const user = userEvent.setup();
    const onBackHome = vi.fn();

    render(
      <SKPIVerifyPage
        userId="00000000-0000-0000-0000-000000000000"
        onBackHome={onBackHome}
      />
    );

    expect(
      await screen.findByRole("heading", {
        name: "Data Verifikasi SKPI Tidak Ditemukan",
      })
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Kembali ke PeerLearn" })
    );
    expect(onBackHome).toHaveBeenCalledTimes(1);
  });
});
