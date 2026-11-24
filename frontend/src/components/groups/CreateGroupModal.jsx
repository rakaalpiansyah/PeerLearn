import React, { useEffect, useRef, useState } from "react";
import {
  X,
  MapPin,
  Video,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  ListOrdered,
  FileText,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { CampusLocationPicker } from "./CampusLocationPicker";
import { groupApi } from "../../api/client";
import { useFormValidation } from "../../hooks/useFormValidation";

const CATEGORIES = [
  "Teknologi",
  "Teknik Elektro",
  "Teknik Lingkungan",
  "Matematika",
  "Fisika",
  "Kimia",
  "Biologi",
  "Agroteknologi",
  "Sains Data",
  "Desain",
  "Bahasa",
  "Soft Skills",
];

export function CreateGroupModal({
  isOpen,
  onClose,
  onCreated,
  onOpenRulebook,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Teknologi");
  const [format, setFormat] = useState("online");
  const [locationOrLink, setLocationOrLink] = useState("");
  const [buildingDetails, setBuildingDetails] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [agenda, setAgenda] = useState([
    "Pengenalan konsep dan materi pokok",
    "Latihan studi kasus atau live coding",
    "Tanya jawab dan diskusi kendala praktis",
  ]);
  const [newAgendaItem, setNewAgendaItem] = useState("");
  const [prerequisites, setPrerequisites] = useState("");

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("16:00");
  const [maxCapacity, setMaxCapacity] = useState(5);
  const [acceptedRulebook, setAcceptedRulebook] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pending = useRef(false);
  const { errors, validate, clearError, clearErrors } = useFormValidation();

  useEffect(() => {
    clearErrors();
    setAcceptedRulebook(false);
  }, [isOpen, clearErrors]);

  const handleAddAgenda = () => {
    const trimmed = newAgendaItem.trim();
    if (!trimmed) return;
    setAgenda([...agenda, trimmed]);
    setNewAgendaItem("");
  };

  const handleRemoveAgenda = (idx) => {
    setAgenda(agenda.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pending.current) return;

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);
    const customErrors = {};
    if (
      date &&
      startTime &&
      endTime &&
      !Number.isNaN(startDateTime.getTime()) &&
      !Number.isNaN(endDateTime.getTime()) &&
      endDateTime <= startDateTime
    ) {
      customErrors.group_end_time =
        "Waktu selesai harus lebih lambat dari waktu mulai";
    }
    if (!acceptedRulebook) {
      customErrors.group_rulebook =
        "Anda wajib menyetujui Rulebook Komunitas PeerLearn sebelum mengajukan sesi";
    }
    if (!validate(e.currentTarget, customErrors)) return;

    setError(null);
    pending.current = true;
    setLoading(true);

    try {
      const payload = {
        title,
        description,
        category,
        format,
        location_or_link: locationOrLink,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        max_capacity: Number(maxCapacity),
        agenda: agenda.filter((item) => item.trim().length > 0),
        prerequisites: prerequisites.trim(),
      };

      if (format === "offline") {
        payload.building_details = buildingDetails.trim();
        const latVal = parseFloat(latitude);
        const lngVal = parseFloat(longitude);
        if (!Number.isNaN(latVal) && !Number.isNaN(lngVal)) {
          payload.latitude = latVal;
          payload.longitude = lngVal;
        }
      }

      const res = await groupApi.create(payload);
      if (res.success) {
        onCreated(res.data);
        onClose();
      } else {
        throw new Error(res.message || "Gagal membuat sesi");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat mempublikasikan sesi");
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="create-group-title">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100">
          <div>
            <h2
              id="create-group-title"
              className="text-lg font-extrabold text-slate-900 tracking-tight"
            >
              Buka Sesi Belajar Baru
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bagikan keahlian Anda dan bimbing rekan sebaya tanpa pungutan
              biaya
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          noValidate
          onChangeCapture={clearError}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5"
        >
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Topik / Judul Sesi Belajar"
            id="group_title"
            error={errors.group_title}
            placeholder="cth. Bedah Soal Struktur Data & Graph"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="group_category"
                className="block text-xs font-semibold text-slate-700"
              >
                Kategori Materi
              </label>
              <select
                id="group_category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[42px] px-3.5 py-2 text-sm rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 shadow-2xs"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Format Pelaksanaan
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormat("online")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    format === "online"
                      ? "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Video
                    className={`w-3.5 h-3.5 ${
                      format === "online"
                        ? "text-emerald-700"
                        : "text-slate-500"
                    }`}
                  />
                  Daring
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("offline")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    format === "offline"
                      ? "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <MapPin
                    className={`w-3.5 h-3.5 ${
                      format === "offline"
                        ? "text-emerald-700"
                        : "text-slate-500"
                    }`}
                  />
                  Luring
                </button>
              </div>
            </div>
          </div>

          <Input
            label={
              format === "online"
                ? "Tautan Pertemuan Daring"
                : "Lokasi Fisik / Nama Tempat Kampus"
            }
            id="group_location"
            error={errors.group_location}
            placeholder={
              format === "online"
                ? "cth. https://meet.google.com/abc-defg-hij"
                : "cth. Perpustakaan Pusat UI Depok"
            }
            required
            value={locationOrLink}
            onChange={(e) => setLocationOrLink(e.target.value)}
            helperText="Hanya peserta terkonfirmasi yang dapat mengakses detail ini"
          />

          {format === "offline" && (
            <CampusLocationPicker
              isOpen={isOpen}
              locationOrLink={locationOrLink}
              onLocationOrLinkChange={setLocationOrLink}
              buildingDetails={buildingDetails}
              onBuildingDetailsChange={setBuildingDetails}
              latitude={latitude}
              onLatitudeChange={setLatitude}
              longitude={longitude}
              onLongitudeChange={setLongitude}
            />
          )}

          {/* Structured Agenda & Syllabus */}
          <div className="space-y-2.5 p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-emerald-700" />
                Silabus / Agenda Pembahasan Sesi
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                {agenda.length} Butir Agenda
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Tuliskan urutan materi yang akan dibedah bersama agar peserta siap
              dan diskusi berjalan runtut.
            </p>

            <div className="space-y-2">
              {agenda.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 shadow-2xs"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px] border border-emerald-200/80">
                    {idx + 1}
                  </span>
                  <span className="flex-1 leading-relaxed font-medium">
                    {item}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAgenda(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    aria-label={`Hapus butir agenda ${idx + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Tambahkan butir agenda baru..."
                value={newAgendaItem}
                onChange={(e) => setNewAgendaItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAgenda();
                  }
                }}
                className="flex-1 min-h-[38px] px-3.5 py-1.5 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 shadow-2xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAgenda}
                disabled={!newAgendaItem.trim()}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah
              </Button>
            </div>
          </div>

          {/* Prerequisites */}
          <div className="space-y-1.5">
            <label
              htmlFor="prerequisites"
              className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              Prasyarat & Perlengkapan Belajar (Opsional)
            </label>
            <textarea
              id="prerequisites"
              rows={2}
              placeholder="cth. Bawa laptop pribadi dengan baterai penuh, install Node.js v20+, baca modul bab 4..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 placeholder:text-slate-400 shadow-2xs"
              value={prerequisites}
              onChange={(e) => setPrerequisites(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Tanggal"
              id="group_date"
              error={errors.group_date}
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              label="Mulai"
              id="group_start_time"
              error={errors.group_start_time}
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              label="Selesai"
              id="group_end_time"
              error={errors.group_end_time}
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <Input
            label="Kapasitas Maksimal Peserta (Orang)"
            id="group_capacity"
            type="number"
            required
            min={2}
            max={50}
            step={1}
            error={errors.group_capacity}
            value={maxCapacity}
            onChange={(e) => setMaxCapacity(e.target.value)}
            helperText="Disarankan 3-8 orang untuk diskusi interaktif yang lebih fokus"
          />

          <div className="space-y-1.5">
            <label
              htmlFor="group_description"
              className="block text-xs font-semibold text-slate-700"
            >
              Rincian Pembahasan / Deskripsi Sesi
            </label>
            <textarea
              id="group_description"
              rows={2}
              placeholder="Ceritakan gambaran umum sesi belajar ini..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 placeholder:text-slate-400 shadow-2xs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            Pengajuan sesi belajar akan diperiksa kelengkapannya oleh Tim Admin
            Komunitas terlebih dahulu sebelum tampil di katalog mahasiswa.
          </div>

          {/* Rulebook Consent Checkbox */}
          <div className="space-y-1">
            <label
              htmlFor="group_rulebook"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer"
            >
              <input
                id="group_rulebook"
                name="group_rulebook"
                type="checkbox"
                checked={acceptedRulebook}
                onChange={(e) => setAcceptedRulebook(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                Saya menyatakan sesi ini bebas biaya, bukan joki akademik, dan
                mematuhi{" "}
                {onOpenRulebook ? (
                  <button
                    type="button"
                    onClick={onOpenRulebook}
                    className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                  >
                    Rulebook Komunitas PeerLearn
                  </button>
                ) : (
                  <strong className="text-slate-900">
                    Rulebook Komunitas PeerLearn
                  </strong>
                )}
                .
              </span>
            </label>
            {errors.group_rulebook && (
              <p
                role="alert"
                className="text-xs text-rose-600 font-medium pl-1"
              >
                {errors.group_rulebook}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClose}
              disabled={loading}
              className="text-slate-600 hover:bg-slate-100"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={loading}
            >
              <Check className="w-4 h-4" />
              Ajukan & Publikasikan Sesi
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
