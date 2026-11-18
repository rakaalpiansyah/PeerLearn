// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentSupportModal } from "./StudentSupportModal";
import { supportApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    user: {
      id: "student-1",
      full_name: "Nabila Azzahra",
      role: "student",
    },
  });

  vi.spyOn(supportApi, "getMyThread").mockResolvedValue({
    success: true,
    data: {
      id: "thread-1",
      status: "open",
      messages: [
        {
          id: "m1",
          sender_id: "admin-2",
          message: "Halo Nabila, ada yang bisa tim admin bantu?",
          created_at: "2026-11-18T08:00:00Z",
          sender: {
            id: "admin-2",
            full_name: "Koordinator Kemahasiswaan FST",
            role: "admin",
          },
        },
      ],
    },
  });

  vi.spyOn(supportApi, "sendStudentMessage").mockResolvedValue({
    success: true,
    data: {
      id: "m2",
      sender_id: "student-1",
      message: "Mohon cek pengajuan sesi Basis Data saya.",
      created_at: "2026-11-18T08:05:00Z",
      sender: { id: "student-1", full_name: "Nabila Azzahra", role: "student" },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StudentSupportModal", () => {
  it("loads admin replies and allows student to send message", async () => {
    const user = userEvent.setup();
    render(<StudentSupportModal isOpen onClose={vi.fn()} />);

    expect(
      await screen.findByRole("dialog", { name: "Ruang Bantuan & Chat Admin" })
    ).toBeTruthy();

    expect(
      await screen.findByText("Halo Nabila, ada yang bisa tim admin bantu?")
    ).toBeTruthy();
    expect(screen.getByText("Koordinator Kemahasiswaan FST")).toBeTruthy();

    await user.type(
      screen.getByLabelText("Tulis pesan untuk admin"),
      "Mohon cek pengajuan sesi Basis Data saya."
    );
    await user.click(screen.getByRole("button", { name: "Kirim" }));

    await waitFor(() =>
      expect(supportApi.sendStudentMessage).toHaveBeenCalledWith({
        subject: undefined,
        message: "Mohon cek pengajuan sesi Basis Data saya.",
      })
    );
    expect(
      await screen.findByText("Mohon cek pengajuan sesi Basis Data saya.")
    ).toBeTruthy();
  });
});
