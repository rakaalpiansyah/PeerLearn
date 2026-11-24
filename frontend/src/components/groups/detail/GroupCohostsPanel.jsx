import React, { useState } from "react";
import { UserPlus, Check, XCircle, Trash2, Users } from "lucide-react";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { UserAvatar } from "../../ui/UserAvatar";
import { cohostApi } from "../../../api/client";

const MAX_COHOSTS = 3;

export function GroupCohostsPanel({
  groupId,
  cohosts = [],
  currentUserId,
  isPrimaryHost,
  onUpdated,
  onSuccess,
  onError,
  onOpenPublicProfile,
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);

  const acceptedCohosts = cohosts.filter((c) => c.status === "accepted");
  const myPendingInvite = cohosts.find(
    (c) => c.user_id === currentUserId && c.status === "invited",
  );

  // Sembunyikan panel jika bukan host, tidak ada co-tutor aktif, dan tidak ada undangan masuk
  if (!isPrimaryHost && acceptedCohosts.length === 0 && !myPendingInvite) {
    return null;
  }

  const handleInvite = async (e) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email || inviting) return;

    setInviting(true);
    onError(null);
    try {
      const res = await cohostApi.invite(groupId, email);
      if (res.success) {
        setInviteEmail("");
        onSuccess("Undangan Co-Tutor berhasil dikirim!");
        onUpdated();
      }
    } catch (err) {
      onError(err.message || "Gagal mengundang Co-Tutor.");
    } finally {
      setInviting(false);
    }
  };

  const handleRespond = async (status) => {
    setBusyUserId(currentUserId);
    onError(null);
    try {
      const res = await cohostApi.respond(groupId, status);
      if (res.success) {
        onSuccess(
          status === "accepted"
            ? "Anda resmi bergabung sebagai Co-Tutor di sesi ini!"
            : "Undangan Co-Tutor telah ditolak.",
        );
        onUpdated();
      }
    } catch (err) {
      onError(err.message || "Gagal memproses undangan Co-Tutor.");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemove = async (targetUserId) => {
    setBusyUserId(targetUserId);
    onError(null);
    try {
      const res = await cohostApi.remove(groupId, targetUserId);
      if (res.success) {
        onSuccess("Co-Tutor berhasil dihapus dari sesi.");
        onUpdated();
      }
    } catch (err) {
      onError(err.message || "Gagal menghapus Co-Tutor.");
    } finally {
      setBusyUserId(null);
    }
  };

  const visibleList = isPrimaryHost ? cohosts : acceptedCohosts;

  return (
    <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-700 shrink-0" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Tim Tutor / Co-Tutor ({acceptedCohosts.length}/{MAX_COHOSTS})
          </h3>
        </div>
        {isPrimaryHost && (
          <span className="text-[11px] text-slate-500">
            Maks. {MAX_COHOSTS} Co-Tutor
          </span>
        )}
      </div>

      {/* Banner Undangan Masuk untuk User yang Diundang */}
      {myPendingInvite && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <p className="text-xs text-emerald-900 font-medium">
            Anda diundang menjadi <strong>Co-Tutor</strong> untuk membantu
            membimbing sesi belajar ini.
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => handleRespond("accepted")}
              isLoading={busyUserId === currentUserId}
            >
              <Check className="w-3.5 h-3.5" />
              Terima
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => handleRespond("declined")}
              disabled={busyUserId === currentUserId}
              className="text-rose-600 hover:bg-rose-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Tolak
            </Button>
          </div>
        </div>
      )}

      {/* Daftar Co-Tutor */}
      {visibleList.length > 0 ? (
        <div className="space-y-2">
          {visibleList.map((c) => (
            <div
              key={c.id || c.user_id}
              className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar user={c.user} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenPublicProfile &&
                        c.user?.id &&
                        onOpenPublicProfile(c.user.id, c.user)
                      }
                      className="text-xs font-semibold text-slate-900 truncate hover:text-emerald-800 text-left"
                    >
                      {c.user?.full_name || "Co-Tutor"}
                    </button>
                    <Badge
                      variant={c.status === "accepted" ? "success" : "warning"}
                      className="text-[10px] py-0"
                    >
                      {c.status === "accepted" ? "Co-Tutor Aktif" : "Diundang"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    {c.user?.campus_name || c.user?.email}
                  </p>
                </div>
              </div>

              {(isPrimaryHost || c.user_id === currentUserId) && (
                <button
                  type="button"
                  onClick={() => handleRemove(c.user_id)}
                  disabled={busyUserId === c.user_id}
                  aria-label={`Hapus Co-Tutor ${c.user?.full_name || ""}`}
                  title={
                    isPrimaryHost ? "Hapus Co-Tutor" : "Keluar sebagai Co-Tutor"
                  }
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        isPrimaryHost && (
          <p className="text-xs text-slate-500 italic">
            Belum ada Co-Tutor. Undang rekan mahasiswa untuk membimbing sesi ini
            bersama.
          </p>
        )
      )}

      {/* Form Undang Co-Tutor (Khusus Primary Host) */}
      {isPrimaryHost && cohosts.length < MAX_COHOSTS && (
        <form onSubmit={handleInvite} className="flex items-center gap-2 pt-1">
          <input
            type="email"
            placeholder="Email akun rekan Co-Tutor (cth. nama@uinsgd.ac.id)"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 min-h-[36px] px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            isLoading={inviting}
            disabled={!inviteEmail.trim()}
            className="shrink-0 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Undang
          </Button>
        </form>
      )}
    </div>
  );
}
