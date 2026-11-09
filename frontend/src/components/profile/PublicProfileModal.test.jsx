// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { PublicProfileModal } from "./PublicProfileModal";
import { AuthProvider } from "../../context/AuthContext";
import { userApi } from "../../api/client";

afterEach(cleanup);

describe("PublicProfileModal", () => {
  it("renders mastered and learning skills accurately with their names and categories", async () => {
    const mockProfile = {
      id: "user-123",
      full_name: "Raka Pratama",
      role: "student",
      campus_name: "UIN SGD Bandung - S1 Teknik Informatika",
      bio: "Senang belajar algoritma dan backend",
      contribution_points: 25,
      skills: [
        {
          skill_id: "s-1",
          skill_type: "mastered",
          skill: { id: "s-1", name: "Pemrograman Web (Go & React)", category: "Teknologi" },
        },
        {
          skill_id: "s-2",
          skill_type: "learning",
          skill: { id: "s-2", name: "Struktur Data & Algoritma", category: "Teknologi" },
        },
      ],
    };

    vi.spyOn(userApi, "getPublicProfile").mockResolvedValue({
      success: true,
      data: mockProfile,
    });

    render(
      <AuthProvider>
        <PublicProfileModal isOpen userId="user-123" onClose={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Pemrograman Web (Go & React)")).toBeTruthy();
      expect(screen.getByText("Struktur Data & Algoritma")).toBeTruthy();
    });

    // Check heading sections
    expect(screen.getByText(/Keahlian yang Dikuasai/)).toBeTruthy();
    expect(screen.getByText(/Topik yang Sedang Dipelajari/)).toBeTruthy();
  });

  it("handles empty skills gracefully without rendering empty broken pills", async () => {
    vi.spyOn(userApi, "getPublicProfile").mockResolvedValue({
      success: true,
      data: {
        id: "user-empty",
        full_name: "Peserta Baru",
        role: "student",
        skills: [],
      },
    });

    render(
      <AuthProvider>
        <PublicProfileModal isOpen userId="user-empty" onClose={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Belum menandai keahlian tutor.")).toBeTruthy();
      expect(screen.getByText("Belum memilih topik yang ingin dipelajari.")).toBeTruthy();
    });
  });
});
