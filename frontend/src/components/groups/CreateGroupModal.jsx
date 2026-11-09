import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Navigation,
  ListOrdered,
  FileText,
  ExternalLink,
  Link as LinkIcon,
  CheckCircle2,
  Compass,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
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

const CAMPUS_PRESETS = [
  { name: "Pilih Preset Kampus (Opsional)", lat: null, lng: null },
  {
    name: "UIN SGD Bandung: Gedung FST & Lab Kampus 1 Cipadung",
    lat: -6.931754,
    lng: 107.717145,
    building: "Gedung FST Lt. 3 Lab Komputer",
  },
  {
    name: "UIN SGD Bandung: Laboratorium Terpadu MIPA FST",
    lat: -6.93185,
    lng: 107.7173,
    building: "Lab Fisika, Kimia, & Biologi Terpadu",
  },
  {
    name: "UIN SGD Bandung: Perpustakaan Utama Kampus 1",
    lat: -6.9322,
    lng: 107.7175,
    building: "Lt. 2 Area Belajar Mandiri / Diskusi",
  },
  {
    name: "UIN SGD Bandung: Gedung Kuliah Bersama (GKB) Kampus 1",
    lat: -6.9315,
    lng: 107.7168,
    building: "Gazebo & Selasar Diskusi Mahasiswa",
  },
  {
    name: "UIN SGD Bandung: Kampus 2 (Jl. Soekarno-Hatta)",
    lat: -6.9388,
    lng: 107.698,
    building: "Gedung Perkuliahan Kampus 2",
  },
  { name: "UI Depok: Perpustakaan Pusat", lat: -6.3653, lng: 106.8315 },
  { name: "UI Depok: Fasilkom Gedung Baru", lat: -6.3644, lng: 106.8286 },
  { name: "ITB Bandung: Perpustakaan Pusat", lat: -6.8929, lng: 107.6106 },
  { name: "UGM Yogyakarta: Perpustakaan Pusat", lat: -7.7713, lng: 110.3775 },
  { name: "ITS Surabaya: Perpustakaan Pusat", lat: -7.2819, lng: 112.7953 },
  { name: "Binus Anggrek Jakarta: Kampus Utama", lat: -6.2018, lng: 106.7822 },
  { name: "Undip Tembalang: Gedung Widya Puraya", lat: -7.0505, lng: 110.4398 },
  { name: "Unair Surabaya: Kampus B", lat: -7.2842, lng: 112.7582 },
];

export function CreateGroupModal({ isOpen, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Teknologi");
  const [format, setFormat] = useState("online");
  const [locationOrLink, setLocationOrLink] = useState("");
  const [buildingDetails, setBuildingDetails] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locating, setLocating] = useState(false);
  const [locatingError, setLocatingError] = useState(null);

  const [mapInputLink, setMapInputLink] = useState("");
  const [resolvingLink, setResolvingLink] = useState(false);
  const [mapResolveSuccess, setMapResolveSuccess] = useState(null);
  const [mapResolveError, setMapResolveError] = useState(null);

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pending = useRef(false);
  const { errors, validate, clearError, clearErrors } = useFormValidation();

  useEffect(() => {
    clearErrors();
    setMapResolveSuccess(null);
    setMapResolveError(null);
  }, [isOpen, clearErrors]);

  const handlePresetChange = (e) => {
    const selected = CAMPUS_PRESETS.find((p) => p.name === e.target.value);
    if (selected && selected.lat !== null) {
      applyQuickPreset(selected);
    }
  };

  const applyQuickPreset = (preset) => {
    if (!preset || preset.lat === null) return;
    setLatitude(preset.lat.toString());
    setLongitude(preset.lng.toString());
    setMapResolveSuccess(`Preset diterapkan: ${preset.name}`);
    setMapResolveError(null);
    if (!locationOrLink || locationOrLink.includes("UI Depok") || locationOrLink.includes("UIN SGD")) {
      setLocationOrLink(preset.name);
    }
    if (preset.building && !buildingDetails) {
      setBuildingDetails(preset.building);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocatingError("Fitur geolokasi tidak didukung oleh peramban ini.");
      return;
    }
    setLocating(true);
    setLocatingError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latStr = pos.coords.latitude.toFixed(6);
        const lngStr = pos.coords.longitude.toFixed(6);
        setLatitude(latStr);
        setLongitude(lngStr);
        setMapResolveSuccess(`Titik GPS berhasil terdeteksi: ${latStr}, ${lngStr}`);
        setLocating(false);
      },
      (err) => {
        setLocatingError("Gagal mendeteksi lokasi GPS: " + err.message);
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleResolveMapLink = async (linkToResolve = mapInputLink) => {
    const trimmed = (linkToResolve || "").trim();
    if (!trimmed) {
      setMapResolveError(
        "Masukkan tautan Google Maps atau titik koordinat terlebih dahulu"
      );
      return;
    }
    setResolvingLink(true);
    setMapResolveError(null);
    setMapResolveSuccess(null);
    try {
      const res = await groupApi.resolveMapLink(trimmed);
      if (res.success && res.data) {
        const { latitude: lat, longitude: lng, place_name } = res.data;
        const latStr = lat.toFixed(6);
        const lngStr = lng.toFixed(6);
        setLatitude(latStr);
        setLongitude(lngStr);
        if (place_name && !locationOrLink) {
          setLocationOrLink(place_name);
        }
        setMapResolveSuccess(
          `Titik koordinat berhasil dideteksi: ${latStr}, ${lngStr}${
            place_name ? ` (${place_name})` : ""
          }`
        );
      } else {
        throw new Error(res.message || "Gagal mendeteksi koordinat dari tautan");
      }
    } catch (err) {
      setMapResolveError(
        err.message || "Tautan tidak valid atau tidak memiliki titik koordinat"
      );
    } finally {
      setResolvingLink(false);
    }
  };

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
              Bagikan keahlian Anda dan bimbing rekan sebaya tanpa pungutan biaya
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
                  <Video className={`w-3.5 h-3.5 ${format === "online" ? "text-emerald-700" : "text-slate-500"}`} />
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
                  <MapPin className={`w-3.5 h-3.5 ${format === "offline" ? "text-emerald-700" : "text-slate-500"}`} />
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

          {/* Offline Location Extra Settings */}
          {format === "offline" && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Detail Lokasi Luring & Peta Navigasi</span>
                </div>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold transition-colors"
                >
                  Buka Google Maps <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* Smart Paste Google Maps Link or Coordinates */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-emerald-700" />
                    Tempel Link Google Maps / Shareloc / Titik Koordinat
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Deteksi Otomatis
                  </span>
                </label>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Buka Google Maps, klik <em>Bagikan</em>, lalu salin dan tempelkan tautannya di sini (contoh: <code>maps.app.goo.gl/...</code> atau koordinat <code>-6.3653, 106.8315</code>):
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://maps.app.goo.gl/... atau -6.365300, 106.831500"
                    value={mapInputLink}
                    onChange={(e) => {
                      setMapInputLink(e.target.value);
                      setMapResolveError(null);
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text");
                      if (pasted && pasted.trim()) {
                        handleResolveMapLink(pasted.trim());
                      }
                    }}
                    className="flex-1 min-h-[38px] px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveMapLink()}
                    isLoading={resolvingLink}
                    disabled={!mapInputLink.trim()}
                    className="shrink-0 text-xs border-slate-300 hover:bg-slate-50 text-slate-700"
                  >
                    Terapkan
                  </Button>
                </div>

                {mapResolveSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{mapResolveSuccess}</span>
                  </div>
                )}

                {mapResolveError && (
                  <p className="text-[11px] text-rose-600 font-medium">{mapResolveError}</p>
                )}
              </div>

              <Input
                label="Detail Gedung / Lantai / Ruangan"
                id="building_details"
                placeholder="cth. Gedung Baru Fasilkom Lt. 2 Ruang 2204 atau Gazebo samping Labkom"
                value={buildingDetails}
                onChange={(e) => setBuildingDetails(e.target.value)}
                helperText="Petunjuk spesifik agar rekan belajar tidak tersesat di lokasi"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="campus_preset"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Preset Titik Kampus Populer
                  </label>
                  <select
                    id="campus_preset"
                    onChange={handlePresetChange}
                    className="w-full min-h-[38px] px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  >
                    {CAMPUS_PRESETS.map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  {/* 1-Click Quick Chips UIN SGD Bandung */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 self-center">
                      Cepat:
                    </span>
                    <button
                      type="button"
                      onClick={() => applyQuickPreset(CAMPUS_PRESETS[1])}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800 text-[10px] font-semibold text-slate-700 transition-colors"
                      title="UIN SGD Gedung FST & Lab"
                    >
                      🏛️ FST UIN SGD
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickPreset(CAMPUS_PRESETS[2])}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800 text-[10px] font-semibold text-slate-700 transition-colors"
                      title="UIN SGD Laboratorium Terpadu MIPA FST"
                    >
                      🔬 Lab MIPA FST
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickPreset(CAMPUS_PRESETS[3])}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800 text-[10px] font-semibold text-slate-700 transition-colors"
                      title="UIN SGD Perpustakaan Pusat Kampus 1"
                    >
                      📚 Perpus UIN SGD
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickPreset(CAMPUS_PRESETS[4])}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800 text-[10px] font-semibold text-slate-700 transition-colors"
                      title="UIN SGD Gedung Kuliah Bersama (GKB)"
                    >
                      🏢 GKB UIN SGD
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickPreset(CAMPUS_PRESETS[5])}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800 text-[10px] font-semibold text-slate-700 transition-colors"
                      title="UIN SGD Kampus 2 Soekarno-Hatta"
                    >
                      📍 Kampus 2 Soetta
                    </button>
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={locating}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs text-emerald-700 font-bold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                    {locating
                      ? "Mendeteksi posisi GPS..."
                      : "Gunakan Lokasi GPS Saya Saat Ini"}
                  </button>
                </div>
              </div>
              {locatingError && (
                <p className="text-xs text-rose-600 font-medium">{locatingError}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Latitude"
                  id="geo_lat"
                  placeholder="-6.365300"
                  value={latitude}
                  onChange={(e) => {
                    setLatitude(e.target.value);
                    setMapResolveSuccess(null);
                  }}
                />
                <Input
                  label="Longitude"
                  id="geo_lng"
                  placeholder="106.831500"
                  value={longitude}
                  onChange={(e) => {
                    setLongitude(e.target.value);
                    setMapResolveSuccess(null);
                  }}
                />
              </div>

              {/* Live Map Preview if coordinates are present */}
              {latitude &&
                longitude &&
                !Number.isNaN(parseFloat(latitude)) &&
                !Number.isNaN(parseFloat(longitude)) && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-emerald-700" />
                        Pratinjau Peta Titik Kumpul
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-800 hover:text-emerald-950 font-bold inline-flex items-center gap-1 text-[11px]"
                      >
                        Uji Buka di Google Maps{" "}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-300 bg-slate-100 shadow-2xs">
                      <iframe
                        title="Pratinjau Peta Sesi"
                        className="w-full h-full border-0"
                        loading="lazy"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                          parseFloat(longitude) - 0.005
                        }%2C${parseFloat(latitude) - 0.003}%2C${
                          parseFloat(longitude) + 0.005
                        }%2C${
                          parseFloat(latitude) + 0.003
                        }&layer=mapnik&marker=${latitude}%2C${longitude}`}
                      />
                    </div>
                  </div>
                )}
            </div>
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
                  <span className="flex-1 leading-relaxed font-medium">{item}</span>
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
              Publikasikan Sesi Belajar
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
