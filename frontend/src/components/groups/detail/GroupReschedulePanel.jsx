import React, { useState, useEffect } from "react";
import { Calendar, X } from "lucide-react";
import { Button } from "../../ui/Button";
import { groupApi } from "../../../api/client";

const pad = (n) => (n < 10 ? `0${n}` : n);

export function GroupReschedulePanel({ group, onClose, onSuccess, onError }) {
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [rescheduleLocation, setRescheduleLocation] = useState("");
  const [rescheduleNextTopic, setRescheduleNextTopic] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);

  useEffect(() => {
    if (!group) return;
    const sDate = new Date(group.start_time);
    const eDate = new Date(group.end_time);
    const yyyy = sDate.getFullYear();
    const mm = pad(sDate.getMonth() + 1);
    const dd = pad(sDate.getDate());
    setRescheduleDate(`${yyyy}-${mm}-${dd}`);
    setRescheduleStart(`${pad(sDate.getHours())}:${pad(sDate.getMinutes())}`);
    setRescheduleEnd(`${pad(eDate.getHours())}:${pad(eDate.getMinutes())}`);
    setRescheduleLocation(group.location_or_link || "");
    setRescheduleNextTopic("");
  }, [group]);

  const advanceOneWeek = () => {
    const base = rescheduleDate
      ? new Date(`${rescheduleDate}T00:00:00`)
      : new Date();
    base.setDate(base.getDate() + 7);
    const yyyy = base.getFullYear();
    const mm = pad(base.getMonth() + 1);
    const dd = pad(base.getDate());
    setRescheduleDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleDate || !rescheduleStart || !rescheduleEnd) {
      onError("Tanggal dan jam pelaksanaan wajib diisi.");
      return;
    }
    const [sH, sM] = rescheduleStart.split(":").map(Number);
    const [eH, eM] = rescheduleEnd.split(":").map(Number);
    const sTime = new Date(`${rescheduleDate}T00:00:00`);
    sTime.setHours(sH, sM, 0, 0);
    const eTime = new Date(`${rescheduleDate}T00:00:00`);
    eTime.setHours(eH, eM, 0, 0);

    if (eTime <= sTime) {
      onError("Waktu selesai harus lebih akhir dari waktu mulai.");
      return;
    }

    setSavingReschedule(true);
    onError(null);
    try {
      const nextAgenda = [...(group.agenda || [])];
      if (
        rescheduleNextTopic.trim() &&
        !nextAgenda.includes(rescheduleNextTopic.trim())
      ) {
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
        onSuccess(
          group.status === "rejected"
            ? "Perbaikan pengajuan berhasil dikirim ulang ke antrean verifikasi Admin!"
            : "Jadwal & materi pertemuan berikutnya berhasil diperbarui!",
        );
      }
    } catch (err) {
      onError(err.message || "Gagal menjadwalkan ulang sesi belajar.");
    } finally {
      setSavingReschedule(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-3 text-xs shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-900 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-700" />
          Jadwalkan Ulang / Reschedule Sesi
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-0.5"
          aria-label="Tutup form reschedule"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[11px] text-slate-600">
        Pilih tanggal dan waktu baru untuk memperbarui jadwal bagi seluruh
        peserta terdaftar.
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
              className="text-[10px] text-emerald-700 hover:text-emerald-900 hover:underline font-semibold"
              title="Majukan 7 hari ke pekan depan"
            >
              +7 Hari
            </button>
          </div>
          <input
            type="date"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700"
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
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700"
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
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700"
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
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700"
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
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={savingReschedule}
        >
          Batal
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSaveReschedule}
          isLoading={savingReschedule}
        >
          Simpan Jadwal Baru
        </Button>
      </div>
    </div>
  );
}
