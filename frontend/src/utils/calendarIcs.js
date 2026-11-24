function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

export function formatIcsUtcDate(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    return "20260101T000000Z";
  }
  return (
    d.getUTCFullYear() +
    pad2(d.getUTCMonth() + 1) +
    pad2(d.getUTCDate()) +
    "T" +
    pad2(d.getUTCHours()) +
    pad2(d.getUTCMinutes()) +
    pad2(d.getUTCSeconds()) +
    "Z"
  );
}

export function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function buildGroupIcsContent(group, includePrivateLocation = false) {
  const safeId = (group?.id || "sesi").replace(/[^a-zA-Z0-9-]/g, "");
  const startUtc = formatIcsUtcDate(group?.start_time);
  const endUtc = formatIcsUtcDate(group?.end_time);
  const stampUtc = formatIcsUtcDate(new Date().toISOString());

  let location = "Akan dibagikan setelah pendaftaran disetujui";
  if (includePrivateLocation) {
    if (group?.format === "online") {
      location = group.location_or_link || "Sesi Daring PeerLearn";
    } else {
      location = group?.building_details
        ? `${group.location_or_link || "Kampus UIN SGD Bandung"} (${group.building_details})`
        : group?.location_or_link || "Kampus UIN SGD Bandung";
    }
  } else if (group?.format === "offline") {
    location = group?.location_or_link || "Kampus UIN SGD Bandung";
  }

  const descParts = [group?.description || "Sesi belajar sebaya PeerLearn UIN SGD Bandung."];
  if (Array.isArray(group?.agenda) && group.agenda.length > 0) {
    descParts.push(
      "Agenda:\n" + group.agenda.map((item, idx) => `${idx + 1}. ${item}`).join("\n")
    );
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PeerLearn UIN SGD Bandung//Jadwal Sesi//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:peerlearn-${safeId}@uinsgd.ac.id`,
    `DTSTAMP:${stampUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${escapeIcsText(group?.title || "Sesi Belajar PeerLearn")}`,
    `DESCRIPTION:${escapeIcsText(descParts.join("\n\n"))}`,
    `LOCATION:${escapeIcsText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.join("\r\n")}\r\n`;
}

export function downloadGroupIcs(group, includePrivateLocation = false) {
  const content = buildGroupIcsContent(group, includePrivateLocation);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const slug = String(group?.title || "sesi-peerlearn")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug || "sesi-peerlearn"}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
