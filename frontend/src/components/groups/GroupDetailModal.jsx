import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Award,
  Check,
  XCircle,
  ExternalLink,
  Star,
  Flag,
  AlertCircle,
  GraduationCap,
  MessageSquare,
  Send,
  ListOrdered,
  Lock,
  Compass,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { UserAvatar } from "../ui/UserAvatar";
import { groupApi, membershipApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

function formatGoogleCalendarDates(startIso, endIso) {
  const format = (iso) => {
    const d = new Date(iso);
    return d.toISOString().replace(/-|:|\.\d\d\d/g, "");
  };
  return `${format(startIso)}/${format(endIso)}`;
}

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
  const [newMessage, setNewMessage] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [joining, setJoining] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [cancellingMembership, setCancellingMembership] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [rescheduleLocation, setRescheduleLocation] = useState("");
  const [rescheduleNextTopic, setRescheduleNextTopic] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const chatBottomRef = useRef(null);

  const isHost = isAuthenticated && user?.id === group?.host_id;
  const isFull = group?.current_members >= group?.max_capacity;

  const userMembership =
    members.find((m) => m.user_id === user?.id)?.status ||
    group?.user_membership;
  const hasAccessToPrivate = isHost || userMembership === "accepted";

  const loadDetails = async () => {
    if (!group?.id) return;
    setLoadingMembers(true);
    try {
      const [membersRes, feedbacksRes] = await Promise.all([
        groupApi.getMembers(group.id),
        groupApi.getFeedbacks(group.id),
      ]);
      if (membersRes.success) setMembers(membersRes.data || []);
      if (feedbacksRes.success) setFeedbacks(feedbacksRes.data || []);
    } catch {
      // Fail gracefully
    } finally {
      setLoadingMembers(false);
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
        setMessages((prev) => {
          if (res.data.length !== prev.length) {
            return res.data;
          }
          return prev;
        });
      }
    } catch {
      // Silent poll failover
    }
  };

  useEffect(() => {
    if (isOpen && group) {
      loadDetails();
      setActionError(null);
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

  useEffect(() => {
    if (activeTab === "chat" && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  if (!isOpen || !group) return null;

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

  const handleOpenReschedule = () => {
    const sDate = new Date(group.start_time);
    const eDate = new Date(group.end_time);
    const pad = (n) => (n < 10 ? `0${n}` : n);
    const yyyy = sDate.getFullYear();
    const mm = pad(sDate.getMonth() + 1);
    const dd = pad(sDate.getDate());
    setRescheduleDate(`${yyyy}-${mm}-${dd}`);
    setRescheduleStart(`${pad(sDate.getHours())}:${pad(sDate.getMinutes())}`);
    setRescheduleEnd(`${pad(eDate.getHours())}:${pad(eDate.getMinutes())}`);
    setRescheduleLocation(group.location_or_link || "");
    setRescheduleNextTopic("");
    setIsRescheduling(true);
    setActionError(null);
    setActionSuccess(null);
  };

  const advanceOneWeek = () => {
    const base = rescheduleDate ? new Date(`${rescheduleDate}T00:00:00`) : new Date();
    base.setDate(base.getDate() + 7);
    const pad = (n) => (n < 10 ? `0${n}` : n);
    const yyyy = base.getFullYear();
    const mm = pad(base.getMonth() + 1);
    const dd = pad(base.getDate());
    setRescheduleDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleDate || !rescheduleStart || !rescheduleEnd) {
      setActionError("Tanggal dan jam pelaksanaan wajib diisi.");
      return;
    }
    const [sH, sM] = rescheduleStart.split(":").map(Number);
    const [eH, eM] = rescheduleEnd.split(":").map(Number);
    const sTime = new Date(`${rescheduleDate}T00:00:00`);
    sTime.setHours(sH, sM, 0, 0);
    const eTime = new Date(`${rescheduleDate}T00:00:00`);
    eTime.setHours(eH, eM, 0, 0);

    if (eTime <= sTime) {
      setActionError("Waktu selesai harus lebih akhir dari waktu mulai.");
      return;
    }

    setSavingReschedule(true);
    setActionError(null);
    try {
      const nextAgenda = [...(group.agenda || [])];
      if (rescheduleNextTopic.trim() && !nextAgenda.includes(rescheduleNextTopic.trim())) {
        nextAgenda.push(rescheduleNextTopic.trim());
      }

      const payload = {
        title: group.title,
        description: group.description,
        category: group.category,
        format: group.format,
        location_or_link: rescheduleLocation.trim() || group.location_or_link,
        latitude: group.latitude,
        longitude: group.longitude,
        building_details: group.building_details,
        agenda: nextAgenda,
        prerequisites: group.prerequisites || "",
        start_time: sTime.toISOString(),
        end_time: eTime.toISOString(),
        max_capacity: group.max_capacity,
      };
      const res = await groupApi.update(group.id, payload);
      if (res.success) {
        setIsRescheduling(false);
        setActionSuccess("Jadwal & materi pertemuan berikutnya berhasil diperbarui!");
        onActionComplete();
        loadDetails();
      }
    } catch (err) {
      setActionError(err.message || "Gagal menjadwalkan ulang sesi belajar.");
    } finally {
      setSavingReschedule(false);
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
        setActionSuccess("Anda telah membatalkan keikutsertaan dalam sesi ini.");
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || sendingMessage) return;

    setSendingMessage(true);
    try {
      const res = await groupApi.sendMessage(group.id, text);
      if (res.success) {
        setMessages((prev) => [...prev, res.data]);
        setNewMessage("");
      } else {
        throw new Error(res.message || "Gagal mengirim pesan");
      }
    } catch (err) {
      setActionError(err.message || "Gagal mengirim pesan diskusi");
    } finally {
      setSendingMessage(false);
    }
  };

  const startDate = new Date(group.start_time);
  const endDate = new Date(group.end_time);
  const dateStr = startDate.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = `${startDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;

  const pendingMembers = members.filter((m) => m.status === "pending");
  const acceptedMembers = members.filter((m) => m.status === "accepted");

  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    group.title
  )}&dates=${formatGoogleCalendarDates(
    group.start_time,
    group.end_time
  )}&details=${encodeURIComponent(
    (group.description || "") +
      (group.agenda && group.agenda.length > 0
        ? "\n\nAgenda:\n" + group.agenda.map((a, i) => `${i + 1}. ${a}`).join("\n")
        : "")
  )}&location=${encodeURIComponent(
    group.format === "online"
      ? group.location_or_link
      : group.building_details
      ? `${group.location_or_link} (${group.building_details})`
      : group.location_or_link
  )}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="group-detail-title">
      <div className="relative w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90dvh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-slate-100 bg-white">
          <div className="space-y-1.5 pr-3 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {group.category}
              </span>
              {group.format === "online" ? (
                <Badge variant="purple">
                  <Video className="w-3 h-3" />
                  Daring (Online)
                </Badge>
              ) : (
                <Badge variant="neutral">
                  <MapPin className="w-3 h-3 text-emerald-600" />
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
            className="min-w-10 min-h-10 shrink-0 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
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
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Informasi & Agenda Sesi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`py-3 px-2 sm:px-4 text-xs font-bold border-b-2 transition-colors flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "chat"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Ruang Diskusi</span>
            {hasAccessToPrivate && messages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold border border-blue-200 shrink-0">
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
          {group.status === "cancelled" && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">Sesi Belajar Ini Telah Dibatalkan oleh Penyelenggara</p>
                <p className="text-[11px] text-rose-700">Seluruh agenda kegiatan atau pertemuan ditiadakan. Anda dapat mencari sesi belajar lain yang tersedia.</p>
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
              {/* Reschedule Form (Only visible to Host when activated) */}
              {isRescheduling && (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-700" />
                      Jadwalkan Ulang / Reschedule Sesi
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRescheduling(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                      aria-label="Tutup form reschedule"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Pilih tanggal dan waktu baru untuk memperbarui jadwal bagi seluruh peserta terdaftar.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Tanggal Baru
                        </label>
                        <button
                          type="button"
                          onClick={advanceOneWeek}
                          className="text-[10px] text-blue-700 hover:underline font-semibold"
                          title="Majukan 7 hari ke pekan depan"
                        >
                          +7 Hari
                        </button>
                      </div>
                      <input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Jam Mulai
                      </label>
                      <input
                        type="time"
                        value={rescheduleStart}
                        onChange={(e) => setRescheduleStart(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Jam Selesai
                      </label>
                      <input
                        type="time"
                        value={rescheduleEnd}
                        onChange={(e) => setRescheduleEnd(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Lokasi / Link Pertemuan Berikutnya
                      </label>
                      <input
                        type="text"
                        placeholder="cth. Lab Komputer FST Lt. 3 atau https://meet.google.com/..."
                        value={rescheduleLocation}
                        onChange={(e) => setRescheduleLocation(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Topik Bahasan Pekan Depan (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="cth. Bab 2: Stack & Queue atau Latihan Praktikum"
                        value={rescheduleNextTopic}
                        onChange={(e) => setRescheduleNextTopic(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsRescheduling(false)}
                      disabled={savingReschedule}
                    >
                      Batal
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveReschedule}
                      isLoading={savingReschedule}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Simpan Jadwal Baru
                    </Button>
                  </div>
                </div>
              )}

              {/* Schedule & Location Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Jadwal Pertemuan
                    </span>
                    {isHost &&
                      group.status !== "completed" &&
                      group.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={handleOpenReschedule}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
                        >
                          Reschedule
                        </button>
                      )}
                  </div>
                  <p className="font-semibold text-slate-900">{dateStr}</p>
                  <p className="text-slate-600">{timeStr}</p>

                  {hasAccessToPrivate && (
                    <a
                      href={googleCalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 pt-1.5 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      <Calendar className="w-3 h-3" />
                      Simpan ke Google Calendar
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    {group.format === "online" ? (
                      <Video className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
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
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium break-all"
                      >
                        Buka Tautan Pertemuan <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-semibold text-emerald-800">
                          {group.location_or_link}
                        </p>
                        {group.building_details && (
                          <p className="text-slate-700 text-[11px] bg-white p-2 rounded border border-slate-200">
                            <span className="text-slate-500 font-medium">Gedung / Ruangan: </span>
                            {group.building_details}
                          </p>
                        )}
                      </div>
                    )
                  ) : (
                    <p className="text-slate-500 italic">
                      Tautan/lokasi akan terbuka otomatis setelah disetujui host
                    </p>
                  )}
                </div>
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
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
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
                        }%2C${
                          group.latitude + 0.003
                        }&layer=mapnik&marker=${group.latitude}%2C${
                          group.longitude
                        }`}
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
                    <ListOrdered className="w-4 h-4 text-blue-600" />
                    Silabus / Rencana Pembahasan ({group.agenda.length} Agenda)
                  </h3>
                  <div className="space-y-2">
                    {group.agenda.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200/90 flex items-start gap-3"
                      >
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px] border border-blue-200 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {item}
                        </p>
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
                  {group.description ||
                    "Tidak ada catatan tambahan untuk sesi ini."}
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
                  className="flex items-start sm:items-center gap-3 text-left hover:opacity-85 transition-opacity rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 w-full min-w-0"
                  aria-label={`Lihat profil ${group.host?.full_name || "tutor"}`}
                >
                  <UserAvatar user={group.host} size="md" className="shrink-0 mt-0.5 sm:mt-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900 hover:text-blue-600">
                        {group.host?.full_name}
                      </span>
                      {group.host?.role === "student" && (
                        <Badge variant="info" className="text-[10px] py-0.5 max-w-full">
                          <GraduationCap className="w-3 h-3 shrink-0" />
                          <span className="truncate">{group.host?.campus_name || "Mahasiswa"}</span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{group.host?.contribution_points || 0} Poin Kontribusi Tutor</span>
                    </p>
                  </div>
                </button>
              </div>

              {/* Host Management Panel (Only visible to Host) */}
              {isHost && (
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Permohonan Masuk Peserta ({pendingMembers.length})</span>
                    </h3>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-600 whitespace-nowrap">
                        Ubah Status Sesi:
                      </span>
                      <select
                        aria-label="Ubah status sesi belajar"
                        value={group.status}
                        onChange={(e) => handleGroupStatus(e.target.value)}
                        className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium shadow-2xs flex-1 sm:flex-initial"
                      >
                        <option value="open">Buka (Pendaftaran Aktif)</option>
                        <option value="ongoing">Sedang Berlangsung</option>
                        <option value="completed">Selesai</option>
                        <option value="cancelled">Dibatalkan</option>
                      </select>
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
                              onClick={() =>
                                handleMemberStatus(m.id, "accepted")
                              }
                              isLoading={updatingStatus === m.id}
                            >
                              <Check className="w-3.5 h-3.5" />
                              Setujui
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleMemberStatus(m.id, "rejected")
                              }
                              disabled={updatingStatus === m.id}
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
                    <span className="text-amber-600 font-semibold">
                      Kuota Penuh
                    </span>
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
                            className="text-xs font-medium text-slate-800 truncate hover:text-blue-600 transition-colors text-left block w-full"
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
                        {fb.comment && (
                          <p className="text-slate-600">{fb.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "chat" && (
            <div className="flex flex-col h-[min(480px,50dvh)] min-h-[300px]">
              {!hasAccessToPrivate ? (
                <div className="m-auto text-center p-6 rounded-2xl bg-slate-50 border border-slate-200 max-w-sm space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Ruang Diskusi Tertutup
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ruang diskusi ini khusus untuk tutor dan peserta yang telah
                    dikonfirmasi bergabung. Silakan ajukan permintaan bergabung
                    terlebih dahulu.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col flex-1 min-h-0">
                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {loadingMessages ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Memuat riwayat percakapan...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="py-12 text-center space-y-2 text-slate-500">
                        <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                        <p className="text-xs font-medium text-slate-700">
                          Belum ada pesan di ruang diskusi sesi ini.
                        </p>
                        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                          Gunakan ruang ini untuk koordinasi materi, titik kumpul, atau tanya jawab sebelum sesi dimulai.
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const senderId = msg.sender_id || msg.user_id;
                        const senderObj = msg.sender || msg.user;
                        const isMe = senderId === user?.id;
                        const isMsgHost = senderId === group.host_id;
                        const msgTime = new Date(msg.created_at).toLocaleTimeString(
                          "id-ID",
                          { hour: "2-digit", minute: "2-digit" }
                        );

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              isMe ? "items-end" : "items-start"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 px-1">
                              <span className="font-semibold text-slate-700">
                                {isMe ? "Anda" : (senderObj?.full_name || "Peserta")}
                              </span>
                              {senderObj?.campus_name && (
                                <span className="text-slate-400 text-[9px]">
                                  ({senderObj.campus_name})
                                </span>
                              )}
                              {isMsgHost && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-50 text-blue-700 border border-blue-200">
                                  Tutor
                                </span>
                              )}
                              <span>• {msgTime}</span>
                            </div>

                            <div
                              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                                isMe
                                  ? "bg-blue-600 text-white rounded-br-xs shadow-2xs"
                                  : "bg-white text-slate-800 rounded-bl-xs border border-slate-200 shadow-2xs"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">
                                {msg.message}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Send box */}
                  <form
                    onSubmit={handleSendMessage}
                    className="pt-3 border-t border-slate-200 flex items-center gap-2 bg-white"
                  >
                    <input
                      type="text"
                      placeholder="Tulis pesan untuk koordinasi sesi..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={sendingMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Kirim
                    </Button>
                  </form>
                </div>
              )}
            </div>
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
