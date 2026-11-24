import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Link as LinkIcon,
  CheckCircle2,
  Compass,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { groupApi } from "../../api/client";
import { useMasterCatalog } from "../../hooks/useMasterCatalog";

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

export function CampusLocationPicker({
  isOpen,
  locationOrLink,
  onLocationOrLinkChange,
  buildingDetails,
  onBuildingDetailsChange,
  latitude,
  onLatitudeChange,
  longitude,
  onLongitudeChange,
}) {
  const [locating, setLocating] = useState(false);
  const [locatingError, setLocatingError] = useState(null);
  const [mapInputLink, setMapInputLink] = useState("");
  const [resolvingLink, setResolvingLink] = useState(false);
  const [mapResolveSuccess, setMapResolveSuccess] = useState(null);
  const [mapResolveError, setMapResolveError] = useState(null);

  useEffect(() => {
    setMapResolveSuccess(null);
    setMapResolveError(null);
  }, [isOpen]);

  const masterCatalog = useMasterCatalog(isOpen);
  const apiLocations = [
    ...masterCatalog.faculties.flatMap((f) => f.locations || []),
    ...(masterCatalog.shared_locations || []),
  ];
  const activePresets =
    apiLocations.length > 0
      ? [
          { name: "Pilih Preset Kampus (Opsional)", lat: null, lng: null },
          ...apiLocations.map((loc) => ({
            name: loc.name,
            shortLabel: loc.short_label || loc.name,
            lat: loc.latitude,
            lng: loc.longitude,
            building: loc.building_details,
          })),
        ]
      : CAMPUS_PRESETS;

  const applyQuickPreset = (preset) => {
    if (!preset || preset.lat === null) return;
    onLatitudeChange(preset.lat.toString());
    onLongitudeChange(preset.lng.toString());
    setMapResolveSuccess(`Preset diterapkan: ${preset.name}`);
    setMapResolveError(null);
    if (
      !locationOrLink ||
      locationOrLink.includes("UI Depok") ||
      locationOrLink.includes("UIN SGD")
    ) {
      onLocationOrLinkChange(preset.name);
    }
    if (preset.building && !buildingDetails) {
      onBuildingDetailsChange(preset.building);
    }
  };

  const handlePresetChange = (e) => {
    const selected = activePresets.find((p) => p.name === e.target.value);
    if (selected && selected.lat !== null) {
      applyQuickPreset(selected);
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
        onLatitudeChange(latStr);
        onLongitudeChange(lngStr);
        setMapResolveSuccess(
          `Titik GPS berhasil terdeteksi: ${latStr}, ${lngStr}`,
        );
        setLocating(false);
      },
      (err) => {
        setLocatingError("Gagal mendeteksi lokasi GPS: " + err.message);
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleResolveMapLink = async (linkToResolve = mapInputLink) => {
    const trimmed = (linkToResolve || "").trim();
    if (!trimmed) {
      setMapResolveError(
        "Masukkan tautan Google Maps atau titik koordinat terlebih dahulu",
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
        onLatitudeChange(latStr);
        onLongitudeChange(lngStr);
        if (place_name && !locationOrLink) {
          onLocationOrLinkChange(place_name);
        }
        setMapResolveSuccess(
          `Titik koordinat berhasil dideteksi: ${latStr}, ${lngStr}${
            place_name ? ` (${place_name})` : ""
          }`,
        );
      } else {
        throw new Error(
          res.message || "Gagal mendeteksi koordinat dari tautan",
        );
      }
    } catch (err) {
      setMapResolveError(
        err.message || "Tautan tidak valid atau tidak memiliki titik koordinat",
      );
    } finally {
      setResolvingLink(false);
    }
  };

  return (
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
          Buka Google Maps, klik <em>Bagikan</em>, lalu salin dan tempelkan
          tautannya di sini (contoh: <code>maps.app.goo.gl/...</code> atau
          koordinat <code>-6.3653, 106.8315</code>):
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
          <p className="text-[11px] text-rose-600 font-medium">
            {mapResolveError}
          </p>
        )}
      </div>

      <Input
        label="Detail Gedung / Lantai / Ruangan"
        id="building_details"
        placeholder="cth. Gedung Baru Fasilkom Lt. 2 Ruang 2204 atau Gazebo samping Labkom"
        value={buildingDetails}
        onChange={(e) => onBuildingDetailsChange(e.target.value)}
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
            {activePresets.map((p, idx) => (
              <option key={idx} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

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
            onLatitudeChange(e.target.value);
            setMapResolveSuccess(null);
          }}
        />
        <Input
          label="Longitude"
          id="geo_lng"
          placeholder="106.831500"
          value={longitude}
          onChange={(e) => {
            onLongitudeChange(e.target.value);
            setMapResolveSuccess(null);
          }}
        />
      </div>

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
                Uji Buka di Google Maps <ExternalLink className="w-2.5 h-2.5" />
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
  );
}
