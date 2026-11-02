import React, { useState, useEffect } from "react";
import {
  X,
  GraduationCap,
  Users,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { useFormValidation } from "../../hooks/useFormValidation";

export function AuthModal({ isOpen, onClose, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [campusName, setCampusName] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const { errors, validate, clearError, clearErrors } = useFormValidation();

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    clearErrors();
  }, [mode, isOpen, clearErrors]);

  const isCampusEmail =
    email.toLowerCase().endsWith(".ac.id") ||
    email.toLowerCase().endsWith(".edu");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !validate(e.currentTarget)) return;
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        const payload = {
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role,
          campus_name: role === "student" ? campusName.trim() : "",
        };
        if (gender) {
          payload.gender = gender;
        }
        await register(payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memproses akun.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="auth-modal-title">
      <div className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2
              id="auth-modal-title"
              className="text-lg font-bold text-slate-900 tracking-tight"
            >
              {mode === "login" ? "Masuk ke PeerLearn" : "Buat Akun Komunitas"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === "login"
                ? "Akses grup belajar dan profil Anda"
                : "Mulai kolaborasi belajar gratis tanpa biaya"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-10 min-h-10 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-lg bg-slate-100 border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === "login"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === "register"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Daftar
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form
          noValidate
          onChangeCapture={clearError}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {mode === "register" && (
            <>
              {/* Role Picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Peran Pengguna
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left ${
                      role === "student"
                        ? "bg-blue-50 border-blue-500 text-blue-900 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900">Mahasiswa</p>
                      <p className="text-[10px] text-slate-500">
                        Kampus / Universitas
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("public")}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left ${
                      role === "public"
                        ? "bg-blue-50 border-blue-500 text-blue-900 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900">Masyarakat</p>
                      <p className="text-[10px] text-slate-500">
                        Warga sekitar kampus
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <Input
                label="Nama Lengkap"
                id="full_name"
                name="full_name"
                error={errors.full_name}
                placeholder="cth. Raka Pratama"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />

              <div className="space-y-1.5">
                <label
                  htmlFor="auth_gender"
                  className="block text-xs font-medium text-slate-700"
                >
                  Jenis Kelamin (Opsional)
                </label>
                <select
                  id="auth_gender"
                  name="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                >
                  <option value="">Pilih jenis kelamin (opsional)</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>

              {role === "student" && (
                <>
                  <Input
                    label="Nama Kampus & Program Studi FST"
                    id="campus_name"
                    name="campus_name"
                    error={errors.campus_name}
                    placeholder="cth. UIN SGD Bandung - S1 Teknik Informatika"
                    value={campusName}
                    onChange={(e) => setCampusName(e.target.value)}
                    helperText="Pilih prodi FST atau ketik nama institusi Anda"
                    list="fst-majors-list"
                  />
                  <datalist id="fst-majors-list">
                    <option value="UIN SGD Bandung - S1 Teknik Informatika" />
                    <option value="UIN SGD Bandung - S1 Teknik Elektro" />
                    <option value="UIN SGD Bandung - S1 Teknik Lingkungan" />
                    <option value="UIN SGD Bandung - S1 Matematika" />
                    <option value="UIN SGD Bandung - S1 Fisika" />
                    <option value="UIN SGD Bandung - S1 Kimia" />
                    <option value="UIN SGD Bandung - S1 Biologi" />
                    <option value="UIN SGD Bandung - S1 Agroteknologi" />
                  </datalist>
                </>
              )}
            </>
          )}

          <div className="space-y-1">
            <Input
              label="Alamat Email"
              id="email"
              name="email"
              error={errors.email}
              type="email"
              autoComplete="email"
              placeholder="nama@email.com atau @kampus.ac.id"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {isCampusEmail && (
              <div className="pt-1">
                <Badge variant="success" className="text-[10px] py-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  Domain Kampus Terdeteksi • Badge Mahasiswa Terverifikasi
                </Badge>
              </div>
            )}
          </div>

          <Input
            label="Kata Sandi"
            id="password"
            name="password"
            error={errors.password}
            minLength={mode === "register" ? 6 : undefined}
            helperText={
              mode === "register" ? "Gunakan minimal 6 karakter." : undefined
            }
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            placeholder={
              mode === "register" ? "Buat kata sandi" : "Masukkan kata sandi"
            }
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={loading}
          >
            {mode === "login" ? "Masuk ke Akun" : "Daftar Sekarang"}
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500">
          Dengan melanjutkan, Anda setuju pada tata tertib kolaborasi belajar
          bebas biaya PeerLearn.
        </div>
      </div>
    </Modal>
  );
}
