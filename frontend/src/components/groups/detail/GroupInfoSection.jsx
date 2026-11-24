import React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Award,
  ExternalLink,
  GraduationCap,
  ListOrdered,
  Compass,
  FileText,
} from "lucide-react";
import { Badge } from "../../ui/Badge";
import { UserAvatar } from "../../ui/UserAvatar";

function formatGoogleCalendarDates(startIso, endIso) {
  const format = (iso) => {
    const d = new Date(iso);
    return d.toISOString().replace(/-|:|\.\d\d\d/g, "");
  };
  return `${format(startIso)}/${format(endIso)}`;
}

export function GroupInfoSection({
  group,
  hasAccessToPrivate,
  isHost,
  onOpenReschedule,
  onOpenPublicProfile,
}) {
  const startDate = new Date(group.start_time);
  const endDate = new Date(group.end_time);
  const dateStr = startDate.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = `${startDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${endDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })} WIB`;

  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    group.title,
  )}&dates=${formatGoogleCalendarDates(
    group.start_time,
    group.end_time,
  )}&details=${encodeURIComponent(
    (group.description || "") +
      (group.agenda && group.agenda.length > 0
        ? "\n\nAgenda:\n" +
          group.agenda.map((a, i) => `${i + 1}. ${a}`).join("\n")
        : ""),
  )}&location=${encodeURIComponent(
    group.format === "online"
      ? group.location_or_link
      : group.building_details
        ? `${group.location_or_link} (${group.building_details})`
        : group.location_or_link,
  )}`;

  return (
    <>
      {/* Schedule & Location Box */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1.5">
          <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            Jadwal Pertemuan
          </span>
          <p className="font-bold text-slate-900 text-sm">{dateStr}</p>
          <p className="text-slate-600 text-xs">{timeStr}</p>

          {hasAccessToPrivate && (
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 pt-1 text-emerald-800 hover:text-emerald-950 font-medium transition-colors"
            >
              <Calendar className="w-3 h-3 text-emerald-700" />
              Simpan ke Google Calendar
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            {group.format === "online" ? (
              <Video className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
            )}
            {group.format === "online"
              ? "Media Pertemuan"
              : "Lokasi Fisik Kampus"}
          </span>

          {hasAccessToPrivate ? (
            group.format === "online" ? (
              <a
                href={
                  group.location_or_link.startsWith("http")
                    ? group.location_or_link
                    : `https://${group.location_or_link}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950 hover:underline font-medium break-all pt-0.5"
              >
                Buka Tautan Pertemuan{" "}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">
                  {group.location_or_link}
                </p>
                {group.building_details && (
                  <p className="text-slate-700 text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium">
                      Gedung / Ruangan:{" "}
                    </span>
                    {group.building_details}
                  </p>
                )}
              </div>
            )
          ) : (
            <p className="text-slate-500 italic text-xs pt-0.5">
              Tautan/lokasi akan terbuka otomatis setelah disetujui host
            </p>
          )}
        </div>

        {/* Host Reschedule Action Bar */}
        {isHost &&
          group.status !== "completed" &&
          group.status !== "cancelled" && (
            <div className="sm:col-span-2 pt-3 mt-1 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                Perlu menyesuaikan jadwal atau tautan sesi ini?
              </span>
              <button
                type="button"
                onClick={onOpenReschedule}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50/60 shadow-2xs transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Jadwalkan Ulang / Reschedule
              </button>
            </div>
          )}
      </div>

      {/* Offline Map Preview & Google Maps Navigation */}
      {group.format === "offline" &&
        group.latitude !== null &&
        group.longitude !== null &&
        group.latitude !== undefined &&
        group.longitude !== undefined && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>Peta Lokasi & Titik Kumpul</span>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${group.latitude},${group.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-800 hover:text-emerald-950 font-medium transition-colors"
              >
                Buka di Google Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
              <iframe
                title="Peta Titik Kumpul Sesi"
                className="w-full h-full border-0"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                  group.longitude - 0.005
                }%2C${group.latitude - 0.003}%2C${
                  group.longitude + 0.005
                }%2C${group.latitude + 0.003}&layer=mapnik&marker=${
                  group.latitude
                }%2C${group.longitude}`}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Titik koordinat: {group.latitude.toFixed(6)},{" "}
              {group.longitude.toFixed(6)}
            </p>
          </div>
        )}

      {/* Agenda Checklist */}
      {group.agenda && group.agenda.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-emerald-700" />
            Silabus / Rencana Pembahasan ({group.agenda.length} Agenda)
          </h3>
          <div className="space-y-2">
            {group.agenda.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200/90 flex items-start gap-3"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px] border border-emerald-200/80 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prerequisites Box */}
      {group.prerequisites && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
          <h3 className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            Prasyarat & Alat Bawaan
          </h3>
          <p className="text-xs text-amber-900/90 whitespace-pre-line leading-relaxed">
            {group.prerequisites}
          </p>
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Deskripsi Sesi
        </h3>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
          {group.description || "Tidak ada catatan tambahan untuk sesi ini."}
        </p>
      </div>

      {/* Host Card */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
        <button
          type="button"
          onClick={() =>
            onOpenPublicProfile &&
            group.host?.id &&
            onOpenPublicProfile(group.host.id, group.host)
          }
          className="flex items-start sm:items-center gap-3 text-left hover:opacity-85 transition-opacity rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 w-full min-w-0"
          aria-label={`Lihat profil ${group.host?.full_name || "tutor"}`}
        >
          <UserAvatar
            user={group.host}
            size="md"
            className="shrink-0 mt-0.5 sm:mt-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 hover:text-emerald-800">
                {group.host?.full_name}
              </span>
              {group.host?.role === "student" && (
                <Badge
                  variant="neutral"
                  className="text-[10px] py-0.5 max-w-full"
                >
                  <GraduationCap className="w-3 h-3 shrink-0 text-emerald-700" />
                  <span className="truncate">
                    {group.host?.campus_name || "Mahasiswa"}
                  </span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                {group.host?.contribution_points || 0} Poin Kontribusi Tutor
              </span>
            </p>
          </div>
        </button>
      </div>
    </>
  );
}
