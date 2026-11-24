import { describe, it, expect } from "vitest";
import { buildGroupIcsContent, escapeIcsText, formatIcsUtcDate } from "./calendarIcs";

describe("calendarIcs", () => {
  it("formats UTC dates and escapes RFC 5545 punctuation cleanly", () => {
    expect(formatIcsUtcDate("2026-11-28T03:30:00.000Z")).toBe("20261128T033000Z");
    expect(escapeIcsText("Materi A, B; C\nBaris 2")).toBe("Materi A\\, B\\; C\\nBaris 2");
  });

  it("masks private meeting link when viewer does not have private access", () => {
    const ics = buildGroupIcsContent(
      {
        id: "abc-123",
        title: "Workshop Algoritma, Struktur Data",
        description: "Bahas tree",
        format: "online",
        location_or_link: "https://meet.google.com/rahasia-banget",
        start_time: "2026-11-28T03:00:00Z",
        end_time: "2026-11-28T05:00:00Z",
        agenda: ["Konsep Tree", "Latihan DFS"],
      },
      false
    );

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Workshop Algoritma\\, Struktur Data");
    expect(ics).not.toContain("rahasia-banget");
    expect(ics).toContain("LOCATION:Akan dibagikan setelah pendaftaran disetujui");
  });

  it("includes exact room or meeting link when viewer has private access", () => {
    const ics = buildGroupIcsContent(
      {
        id: "def-456",
        title: "Kajian Ushul Fiqh",
        format: "offline",
        location_or_link: "Perpustakaan Rachmat Djatnika Kampus 1",
        building_details: "Lantai 2 Ruang Diskusi A",
        start_time: "2026-11-28T06:00:00Z",
        end_time: "2026-11-28T08:00:00Z",
      },
      true
    );

    expect(ics).toContain(
      "LOCATION:Perpustakaan Rachmat Djatnika Kampus 1 (Lantai 2 Ruang Diskusi A)"
    );
  });
});
