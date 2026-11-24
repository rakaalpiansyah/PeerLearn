// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudyRequestBoard } from "./StudyRequestBoard";
import { studyRequestApi } from "../../api/client";
import { useAuth } from "../../context/useAuth";

vi.mock("../../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("StudyRequestBoard Phase 4B", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { id: "stu-1", full_name: "Nabila Azzahra", role: "student" },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("loads requests, toggles vote count, and opens fulfill handler", async () => {
    const user = userEvent.setup();
    const onFulfillRequest = vi.fn();
    const requestItem = {
      id: "sr-1",
      requester_id: "stu-2",
      title: "Klinik Statistik PLS-SEM Skripsi FEBI",
      description: "Butuh bimbingan olah data SmartPLS.",
      category: "Ekonomi & Bisnis Islam",
      preferred_format: "online",
      status: "open",
      vote_count: 3,
      user_voted: false,
      requester: { id: "stu-2", full_name: "Ilham", campus_name: "UIN SGD - FEBI" },
    };

    vi.spyOn(studyRequestApi, "list").mockResolvedValue({
      success: true,
      data: [requestItem],
    });
    vi.spyOn(studyRequestApi, "toggleVote").mockResolvedValue({
      success: true,
      data: { request_id: "sr-1", voted: true, vote_count: 4 },
    });

    await act(async () => {
      render(
        <StudyRequestBoard
          onOpenAuth={vi.fn()}
          onFulfillRequest={onFulfillRequest}
          onOpenGroupById={vi.fn()}
        />
      );
    });

    expect(
      await screen.findByText("Klinik Statistik PLS-SEM Skripsi FEBI")
    ).toBeTruthy();

    const voteBtn = screen.getByRole("button", { name: /Dukung/i });
    await user.click(voteBtn);
    expect(studyRequestApi.toggleVote).toHaveBeenCalledWith("sr-1");
    expect(await screen.findByText("Didukung")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Buka Sesi Ini" }));
    expect(onFulfillRequest).toHaveBeenCalledTimes(1);
    expect(onFulfillRequest.mock.calls[0][0].id).toBe("sr-1");
  });

  it("submits new study request modal and prepends it to board", async () => {
    const user = userEvent.setup();
    vi.spyOn(studyRequestApi, "list").mockResolvedValue({
      success: true,
      data: [],
    });
    vi.spyOn(studyRequestApi, "create").mockResolvedValue({
      success: true,
      data: {
        id: "sr-new",
        title: "Pendalaman Ilmu Hadis Takhrij",
        description: "Bahasan sanad & takhrij digital.",
        category: "Ushuluddin & Studi Islam",
        preferred_format: "offline",
        status: "open",
        vote_count: 1,
        user_voted: true,
        requester: { id: "stu-1", full_name: "Nabila Azzahra" },
      },
    });

    await act(async () => {
      render(
        <StudyRequestBoard
          onOpenAuth={vi.fn()}
          onFulfillRequest={vi.fn()}
          onOpenGroupById={vi.fn()}
        />
      );
    });

    await user.click(await screen.findByRole("button", { name: "Ajukan Usulan Topik" }));
    await user.type(
      screen.getByLabelText(/Judul Topik atau Mata Kuliah/i),
      "Pendalaman Ilmu Hadis Takhrij"
    );
    await user.selectOptions(
      screen.getByLabelText(/Rumpun Ilmu/i),
      "Ushuluddin & Studi Islam"
    );
    await user.click(screen.getByLabelText(/Luring Kampus/i));
    await user.click(screen.getByRole("button", { name: "Kirim Usulan Topik" }));

    expect(studyRequestApi.create).toHaveBeenCalledWith({
      title: "Pendalaman Ilmu Hadis Takhrij",
      description: "",
      category: "Ushuluddin & Studi Islam",
      preferred_format: "offline",
    });
    expect(
      await screen.findByText("Pendalaman Ilmu Hadis Takhrij")
    ).toBeTruthy();
  });
});
