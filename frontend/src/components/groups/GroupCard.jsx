import React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Award,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  ListOrdered,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { UserAvatar } from "../ui/UserAvatar";

export function GroupCard({ group, onClick, onViewProfile }) {
  const remaining = group.max_capacity - group.current_members;
  const isFull = remaining <= 0;
  const isAlmostFull = remaining === 1;

  const startDate = new Date(group.start_time);
  const endDate = new Date(group.end_time);

  const dateStr = startDate.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const timeStr = `${startDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;

  return (
    <article className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-xs">
      <div className="space-y-3.5">
        {/* Category & Format Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            {group.category}
          </span>

          <div className="flex items-center gap-1.5">
            {group.format === "online" ? (
              <Badge variant="neutral" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200">
                <Video className="w-3 h-3 text-emerald-600" />
                Daring
              </Badge>
            ) : (
              <Badge variant="neutral" className="text-[10px] bg-emerald-50/70 text-emerald-800 border-emerald-200">
                <MapPin className="w-3 h-3 text-emerald-600" />
                Luring
              </Badge>
            )}

            {isFull ? (
              <Badge variant="warning" className="text-[10px]">
                Penuh
              </Badge>
            ) : isAlmostFull ? (
              <Badge
                variant="warning"
                className="text-[10px] bg-amber-50 text-amber-800 border-amber-200"
              >
                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                Sisa 1 Kursi
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Match Reason for Smart Recommendations or Agenda indicator */}
        {(group.match_reason || (group.agenda && group.agenda.length > 0)) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {group.match_reason && (
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md w-fit">
                <Sparkles className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                <span className="truncate">Sesuai minat: {group.match_reason}</span>
              </div>
            )}

            {group.agenda && group.agenda.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md w-fit">
                <ListOrdered className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                <span>{group.agenda.length} Agenda Terstruktur</span>
              </div>
            )}
          </div>
        )}

        {/* Title & Description */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
            <button
              type="button"
              onClick={onClick}
              aria-label={`Lihat sesi ${group.title}`}
              className="text-left cursor-pointer after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-emerald-600"
            >
              <span className="line-clamp-2 min-h-[2.75rem] block">{group.title}</span>
            </button>
          </h3>
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {group.description || "Diskusi materi bersama rekan sebaya."}
          </p>
        </div>

        {/* Schedule & Location */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{dateStr}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{timeStr}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-600 font-medium truncate">
            {group.format === "online" ? (
              <>
                <Video className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">
                  Tautan dibuka otomatis untuk peserta terkonfirmasi
                </span>
              </>
            ) : (
              <>
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">
                  {group.location_or_link || "Area Umum Kampus"}
                  {group.building_details ? ` (${group.building_details})` : ""}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Host Section & Capacity */}
      <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => {
            if (onViewProfile && group.host?.id) {
              e.stopPropagation();
              onViewProfile(group.host.id, group.host);
            }
          }}
          className="relative z-10 flex items-center gap-2.5 min-w-0 text-left hover:opacity-85 transition-opacity rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          aria-label={`Lihat profil ${group.host?.full_name || "penyelenggara"}`}
        >
          <UserAvatar user={group.host} size="sm" />
          <div className="truncate text-left">
            <p className="text-xs font-bold text-slate-900 truncate leading-tight hover:text-emerald-700">
              {group.host?.full_name || "Penyelenggara"}
            </p>
            <p className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1 mt-0.5">
              <Award className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
              <span>{group.host?.contribution_points || 0} Poin Tutor</span>
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0 pl-3">
          <div className="text-right">
            <span
              className={`text-xs font-bold ${isFull ? "text-amber-800" : "text-slate-900"}`}
            >
              {group.current_members} / {group.max_capacity}
            </span>
            <p className="text-[11px] text-slate-600 font-medium">Peserta</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
        </div>
      </div>
    </article>
  );
}
