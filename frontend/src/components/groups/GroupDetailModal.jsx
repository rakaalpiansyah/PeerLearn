import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  MapPin,
  Video,
  Check,
  XCircle,
  Star,
  Flag,
  AlertCircle,
  MessageSquare,
  ListOrdered,
  Lock,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { groupApi, membershipApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { GroupReschedulePanel } from "./detail/GroupReschedulePanel";
import { GroupInfoSection } from "./detail/GroupInfoSection";
import { GroupParticipantsPanel } from "./detail/GroupParticipantsPanel";
import { GroupChatPanel } from "./detail/GroupChatPanel";

export function GroupDetailModal({
  isOpen,
  onClose,
  group,
  onActionComplete,
  onOpenFeedback,
  onOpenReport,
  onOpenAuth,
  onOpenPublicProfile,
}) {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("info"); // 'info' | 'chat'
  const [members, setMembers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [joining, setJoining] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [cancellingMembership, setCancellingMembership] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const isHost = isAuthenticated && user?.id === group?.host_id;
  const isFull = group?.current_members >= group?.max_capacity;

  const userMembership =
    members.find((m) => m.user_id === user?.id)?.status ||
    group?.user_membership;
  const hasAccessToPrivate = isHost || userMembership === "accepted";

  const loadDetails = async () => {
    if (!group?.id) return;
    try {
      const [membersRes, feedbacksRes] = await Promise.all([
        groupApi.getMembers(group.id),
        groupApi.getFeedbacks(group.id),
      ]);
      if (membersRes.success) setMembers(membersRes.data || []);
      if (feedbacksRes.success) setFeedbacks(feedbacksRes.data || []);
    } catch {
      // Fail gracefully
    }
  };

  const loadMessages = async () => {
    if (!group?.id || !hasAccessToPrivate) return;
    setLoadingMessages(true);
    try {
      const res = await groupApi.getMessages(group.id);
      if (res.success) {
        setMessages(res.data || []);
      }
    } catch {
      // Chat load failure silent fallback
    } finally {
      setLoadingMessages(false);
    }
  };

  const silentPollMessages = async () => {
    if (!group?.id || !hasAccessToPrivate) return;
    try {
      const res = await groupApi.getMessages(group.id);
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch {
      // Silent poll failover
    }
  };

  useEffect(() => {
    if (isOpen && group) {
      loadDetails();
      setActionError(null);
      setIsRescheduling(false);
      setActiveTab("info");
    }
  }, [isOpen, group]);

  useEffect(() => {
    if (isOpen && group && hasAccessToPrivate) {
      loadMessages();
    }
  }, [isOpen, group?.id, hasAccessToPrivate, activeTab]);

  useEffect(() => {
    if (!isOpen || !group?.id || !hasAccessToPrivate || activeTab !== "chat") {
      return;
    }
    const interval = setInterval(() => {
      silentPollMessages();
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, group?.id, hasAccessToPrivate, activeTab]);

  if (!isOpen || !group) return null;

  const handleOpenReschedule = () => {
    setIsRescheduling(true);
    setActionError(null);
    setActionSuccess(null);
  };

  const handleRescheduleSuccess = (message) => {
    setIsRescheduling(false);
    setActionSuccess(message);
    onActionComplete();
    loadDetails();
  };

  const handleJoin = async () => {
    if (!isAuthenticated) {
      onOpenAuth("login");
      return;
    }
    setJoining(true);
    setActionError(null);
    try {
      const res = await membershipApi.join(group.id);
      if (res.success) {
        onActionComplete();
        loadDetails();
      }
    } catch (err) {
      setActionError(err.message || "Gagal mengajukan permohonan bergabung.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    const membership = members.find((m) => m.user_id === user?.id);
    if (!membership?.id) {
      setActionError("Data keanggotaan Anda tidak ditemukan.");
      return;
    }
    setCancellingMembership(true);
    setActionError(null);
    try {
      const res = await membershipApi.updateStatus(membership.id, "cancelled");
      if (res.success) {
        setActionSuccess(
          "Anda telah membatalkan keikutsertaan dalam sesi ini.",
        );
        onActionComplete();
        loadDetails();
      }
    } catch (err) {
      setActionError(err.message || "Gagal membatalkan keikutsertaan.");
    } finally {
      setCancellingMembership(false);
    }
  };

  const handleMemberStatus = async (membershipId, status) => {
    setUpdatingStatus(membershipId);
    try {
      const res = await membershipApi.updateStatus(membershipId, status);
      if (res.success) {
        onActionComplete();
        loadDetails();
      }
    } catch (err) {
      setActionError(err.message || "Gagal memperbarui status peserta");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleGroupStatus = async (status) => {
    try {
      const res = await groupApi.updateStatus(group.id, status);
      if (res.success) {
        onActionComplete();
        onClose();
      }
    } catch (err) {
      setActionError(err.message || "Gagal memperbarui status kegiatan");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="group-detail-title">
      <div className="relative w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90dvh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-slate-100 bg-white">
          <div className="space-y-1.5 pr-3 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Badge variant="neutral" className="text-xs font-medium">
                {group.category}
              </Badge>
              {group.format === "online" ? (
                <Badge variant="primary">
                  <Video className="w-3 h-3" />
                  Daring (Online)
                </Badge>
              ) : (
                <Badge variant="neutral">
                  <MapPin className="w-3 h-3 text-emerald-700" />
                  Luring Kampus
                </Badge>
              )}
            </div>

            <h2
              id="group-detail-title"
              className="text-base sm:text-xl font-bold text-slate-900 leading-snug"
            >
              {group.title}
            </h2>
          </div>

          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={onClose}
            className="min-w-10 min-h-10 shrink-0 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 sm:flex sm:items-center px-3 sm:px-6 border-b border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`py-3 px-2 sm:px-4 text-xs font-bold border-b-2 transition-colors flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "info"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ListOrdered
              className={`w-3.5 h-3.5 shrink-0 ${
                activeTab === "info" ? "text-emerald-700" : "text-slate-400"
              }`}
            />
            <span className="truncate">Informasi & Agenda Sesi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`py-3 px-2 sm:px-4 text-xs font-bold border-b-2 transition-colors flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "chat"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare
              className={`w-3.5 h-3.5 shrink-0 ${
                activeTab === "chat" ? "text-emerald-700" : "text-slate-400"
              }`}
            />
            <span className="truncate">Ruang Diskusi</span>
            {hasAccessToPrivate && messages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 shrink-0">
                {messages.length}
              </span>
            )}
            {!hasAccessToPrivate && (
              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
            )}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {group.status === "pending_approval" && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">
                  Menunggu Verifikasi & Persetujuan Admin
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Pengajuan kegiatan Anda sedang diperiksa oleh Tim Admin FST.
                  Sesi akan otomatis tayang ke mahasiswa lain setelah di-ACC.
                </p>
              </div>
            </div>
          )}

          {group.status === "rejected" && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    Pengajuan Ditolak / Perlu Perbaikan
                  </p>
                  {group.review_note && (
                    <p className="text-[11px] text-rose-800 leading-relaxed bg-white/80 p-2 rounded-lg border border-rose-200">
                      Catatan Admin: {group.review_note}
                    </p>
                  )}
                  {isHost && (
                    <p className="text-[11px] text-rose-800">
                      Perbarui jadwal, lokasi, atau materi lewat tombol di bawah
                      untuk mengajukan ulang ke antrean verifikasi Admin.
                    </p>
                  )}
                </div>
              </div>
              {isHost && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenReschedule}
                  className="shrink-0 bg-white border-rose-300 text-rose-800 hover:bg-rose-100"
                >
                  Perbaiki & Ajukan Ulang
                </Button>
              )}
            </div>
          )}

          {group.status === "cancelled" && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">
                  Sesi Belajar Ini Telah Dibatalkan oleh Penyelenggara
                </p>
                <p className="text-[11px] text-rose-700">
                  Seluruh agenda kegiatan atau pertemuan ditiadakan. Anda dapat
                  mencari sesi belajar lain yang tersedia.
                </p>
              </div>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionSuccess(null)}
                className="text-emerald-700 hover:text-emerald-900 p-0.5"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {actionError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{actionError}</span>
            </div>
          )}

          {activeTab === "info" && (
            <>
              {isRescheduling && (
                <GroupReschedulePanel
                  group={group}
                  onClose={() => setIsRescheduling(false)}
                  onSuccess={handleRescheduleSuccess}
                  onError={setActionError}
                />
              )}

              <GroupInfoSection
                group={group}
                hasAccessToPrivate={hasAccessToPrivate}
                isHost={isHost}
                onOpenReschedule={handleOpenReschedule}
                onOpenPublicProfile={onOpenPublicProfile}
              />

              <GroupParticipantsPanel
                group={group}
                isHost={isHost}
                isFull={isFull}
                members={members}
                feedbacks={feedbacks}
                updatingStatus={updatingStatus}
                onMemberStatus={handleMemberStatus}
                onGroupStatus={handleGroupStatus}
                onOpenPublicProfile={onOpenPublicProfile}
              />
            </>
          )}

          {activeTab === "chat" && (
            <GroupChatPanel
              group={group}
              user={user}
              isHost={isHost}
              hasAccessToPrivate={hasAccessToPrivate}
              messages={messages}
              setMessages={setMessages}
              loadingMessages={loadingMessages}
              onError={setActionError}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 sm:py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenReport(group.id)}
              className="min-h-[36px] px-2 text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1.5 rounded-lg hover:bg-rose-50/60 transition-colors"
            >
              <Flag className="w-3.5 h-3.5 shrink-0" />
              <span>Laporkan</span>
            </button>

            <Button variant="ghost" size="sm" onClick={onClose}>
              Tutup
            </Button>
          </div>

          {!isHost && (
            <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
              {userMembership === "accepted" ? (
                group.status === "completed" ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenFeedback(group.id)}
                  >
                    <Star className="w-3.5 h-3.5" />
                    Beri Rating Tutor
                  </Button>
                ) : (
                  <>
                    <Badge
                      variant="success"
                      className="rounded-xl py-1.5 px-3 text-xs whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Anda Terdaftar di Sesi Ini</span>
                    </Badge>
                    {group.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLeaveGroup}
                        isLoading={cancellingMembership}
                        className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 whitespace-nowrap"
                      >
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Batal Ikut Sesi</span>
                      </Button>
                    )}
                  </>
                )
              ) : userMembership === "pending" ? (
                <>
                  <Badge
                    variant="warning"
                    className="rounded-xl py-1.5 px-3 text-xs whitespace-nowrap"
                  >
                    <span>Menunggu Persetujuan Host</span>
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLeaveGroup}
                    isLoading={cancellingMembership}
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 whitespace-nowrap"
                  >
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Tarik Permohonan</span>
                  </Button>
                </>
              ) : userMembership === "cancelled" ? (
                <>
                  <span className="text-xs text-slate-500 italic">
                    Keikutsertaan dibatalkan
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleJoin}
                    disabled={isFull || group.status !== "open"}
                    isLoading={joining}
                  >
                    Daftar Kembali
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleJoin}
                  disabled={isFull || group.status !== "open"}
                  isLoading={joining}
                >
                  {isFull ? "Kuota Penuh" : "Minta Bergabung"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
