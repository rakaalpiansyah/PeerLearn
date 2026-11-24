import React from "react";
import { Users, Check, XCircle, Star } from "lucide-react";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { UserAvatar } from "../../ui/UserAvatar";

export function GroupParticipantsPanel({
  group,
  isHost,
  isFull,
  members,
  feedbacks,
  updatingStatus,
  onMemberStatus,
  onGroupStatus,
  onOpenPublicProfile,
}) {
  const pendingMembers = members.filter((m) => m.status === "pending");
  const acceptedMembers = members.filter((m) => m.status === "accepted");

  return (
    <>
      {/* Host Management Panel (Only visible to Host) */}
      {isHost && (
        <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200 space-y-3.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700 shrink-0" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Permohonan Masuk Peserta
              </h3>
              {pendingMembers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  {pendingMembers.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 whitespace-nowrap font-medium">
                Status Sesi:
              </span>
              {group.status === "pending_approval" ||
              group.status === "rejected" ? (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      group.status === "pending_approval" ? "warning" : "danger"
                    }
                  >
                    {group.status === "pending_approval"
                      ? "Menunggu ACC Admin"
                      : "Perlu Revisi"}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onGroupStatus("cancelled")}
                    className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                  >
                    Batalkan
                  </Button>
                </div>
              ) : (
                <select
                  aria-label="Ubah status sesi belajar"
                  value={group.status}
                  onChange={(e) => onGroupStatus(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium shadow-2xs flex-1 sm:flex-initial focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700"
                >
                  <option value="open">Buka (Pendaftaran Aktif)</option>
                  <option value="ongoing">Sedang Berlangsung</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              )}
            </div>
          </div>

          {pendingMembers.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Belum ada permohonan baru yang menunggu persetujuan.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingMembers.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-lg bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {m.user?.full_name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {m.user?.campus_name || m.user?.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onMemberStatus(m.id, "accepted")}
                      isLoading={updatingStatus === m.id}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Setujui
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMemberStatus(m.id, "rejected")}
                      disabled={updatingStatus === m.id}
                      className="text-rose-600 hover:bg-rose-50"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      Tolak
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmed Members List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
          <span>
            Peserta Terkonfirmasi ({acceptedMembers.length} /{" "}
            {group.max_capacity})
          </span>
          {isFull && (
            <span className="text-amber-600 font-semibold">Kuota Penuh</span>
          )}
        </h3>

        {acceptedMembers.length === 0 ? (
          <p className="text-xs text-slate-500 italic">
            Belum ada peserta terkonfirmasi. Jadilah yang pertama bergabung!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {acceptedMembers.map((m) => (
              <div
                key={m.id}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2.5"
              >
                <UserAvatar user={m.user} size="sm" />
                <div className="truncate flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenPublicProfile &&
                      m.user?.id &&
                      onOpenPublicProfile(m.user.id, m.user)
                    }
                    className="text-xs font-medium text-slate-800 truncate hover:text-emerald-800 transition-colors text-left block w-full"
                  >
                    {m.user?.full_name}
                  </button>
                  <p className="text-[10px] text-slate-500 truncate">
                    {m.user?.campus_name || "Anggota"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback & Ratings section */}
      {feedbacks.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Ulasan Sesi ({feedbacks.length})
          </h3>
          <div className="space-y-2">
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {fb.reviewer?.full_name}
                  </span>
                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: fb.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>
                </div>
                {fb.comment && <p className="text-slate-600">{fb.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
