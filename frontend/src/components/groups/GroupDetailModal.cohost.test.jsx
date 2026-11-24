// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../context/AuthContext";
import { authApi, groupApi, userApi } from "../../api/client";
import { GroupDetailModal } from "./GroupDetailModal";

const baseGroup = {
  id: "group-cohost-1",
  title: "Workshop Clean Architecture Go",
  category: "Teknologi",
  description: "Pembahasan layer domain sampai repository.",
  start_time: "2026-11-28T03:00:00Z",
  end_time: "2026-11-28T05:00:00Z",
  format: "online",
  location_or_link: "https://meet.google.com/uin-sgd-go",
  status: "open",
  host_id: "host-1",
  host: {
    id: "host-1",
    full_name: "Nabila Azzahra",
    role: "student",
    campus_name: "UIN SGD Bandung - S1 Teknik Informatika",
    contribution_points: 42,
  },
  co_hosts: [],
  current_members: 1,
  max_capacity: 10,
};

async function renderWithSession(groupProp) {
  let view;
  await act(async () => {
    view = render(
      <AuthProvider>
        <GroupDetailModal
          isOpen={true}
          onClose={vi.fn()}
          group={groupProp}
          onActionComplete={vi.fn()}
        />
      </AuthProvider>
    );
  });
  return view;
}

describe("GroupDetailModal Phase 4A: Co-Author, Materials Tab, and .ics", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(groupApi, "getMembers").mockResolvedValue({ success: true, data: [] });
    vi.spyOn(groupApi, "getFeedbacks").mockResolvedValue({ success: true, data: [] });
    vi.spyOn(groupApi, "getMessages").mockResolvedValue({ success: true, data: [] });
    vi.spyOn(groupApi, "getMaterials").mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("lets primary host search registered user and add them as Co-Author", async () => {
    const user = userEvent.setup();
    localStorage.setItem("peerlearn_token", "host-jwt");
    vi.spyOn(authApi, "getMe").mockResolvedValue({
      success: true,
      data: { id: "host-1", full_name: "Nabila Azzahra", role: "student" },
    });
    vi.spyOn(userApi, "searchUsers").mockResolvedValue({
      success: true,
      data: [
        {
          id: "co-2",
          full_name: "Fajar Ramadhan",
          campus_name: "UIN SGD Bandung - S1 Ilmu Hukum",
          role: "student",
        },
      ],
    });
    vi.spyOn(groupApi, "addCoHost").mockResolvedValue({
      success: true,
      data: [
        {
          group_id: "group-cohost-1",
          user_id: "co-2",
          user: {
            id: "co-2",
            full_name: "Fajar Ramadhan",
            campus_name: "UIN SGD Bandung - S1 Ilmu Hukum",
          },
        },
      ],
    });

    await renderWithSession(baseGroup);

    const searchInput = await screen.findByLabelText(/Cari mahasiswa atau rekan/i);
    await user.type(searchInput, "Fajar");
    await user.click(screen.getByRole("button", { name: "Cari Rekan" }));

    expect(userApi.searchUsers).toHaveBeenCalledWith("Fajar");
    const addBtn = await screen.findByRole("button", { name: /Jadikan Co-Author/i });
    await user.click(addBtn);

    expect(groupApi.addCoHost).toHaveBeenCalledWith("group-cohost-1", "co-2");
    expect(await screen.findByText(/Fajar Ramadhan berhasil ditambahkan sebagai Co-Author/i)).toBeTruthy();
  });

  it("lets Co-Author manage materials tab and hides cancel option", async () => {
    const user = userEvent.setup();
    localStorage.setItem("peerlearn_token", "cohost-jwt");
    vi.spyOn(authApi, "getMe").mockResolvedValue({
      success: true,
      data: { id: "co-2", full_name: "Fajar Ramadhan", role: "student" },
    });
    vi.spyOn(groupApi, "addMaterial").mockResolvedValue({
      success: true,
      data: {
        id: "mat-1",
        group_id: "group-cohost-1",
        title: "Slide Pertemuan 1",
        url: "https://drive.google.com/file/d/abc",
        material_type: "slide",
        uploader: { id: "co-2", full_name: "Fajar Ramadhan" },
      },
    });

    await renderWithSession({
      ...baseGroup,
      co_hosts: [
        {
          group_id: "group-cohost-1",
          user_id: "co-2",
          user: { id: "co-2", full_name: "Fajar Ramadhan" },
        },
      ],
    });

    // Co-Author sees status selector without "Dibatalkan"
    const statusSelect = await screen.findByLabelText("Ubah status sesi belajar");
    const optionValues = Array.from(statusSelect.querySelectorAll("option")).map((o) => o.value);
    expect(optionValues).not.toContain("cancelled");
    expect(screen.queryByRole("button", { name: "Minta Bergabung" })).toBeNull();
    expect(screen.getByRole("button", { name: /Unduh \.ics/i })).toBeTruthy();

    // Co-Author opens Materi Sesi tab and adds a material link
    await user.click(screen.getByRole("tab", { name: /Materi Sesi/i }));
    await user.type(screen.getByLabelText("Judul Materi"), "Slide Pertemuan 1");
    await user.type(screen.getByLabelText(/Alamat Tautan Materi/i), "https://drive.google.com/file/d/abc");
    await user.click(screen.getByRole("button", { name: /Tambah Materi/i }));

    expect(groupApi.addMaterial).toHaveBeenCalledWith("group-cohost-1", {
      title: "Slide Pertemuan 1",
      url: "https://drive.google.com/file/d/abc",
      material_type: "referensi",
    });
    expect(await screen.findByText("Slide Pertemuan 1")).toBeTruthy();
  });
});
