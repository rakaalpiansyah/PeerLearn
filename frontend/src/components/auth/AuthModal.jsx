import React, { useState, useEffect } from "react";
import {
  X,
  GraduationCap,
  Users,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../api/client";
import { useFormValidation } from "../../hooks/useFormValidation";
import { UIN_PROGRAM_OPTIONS } from "../../data/campusData";

export function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
  initialResetToken = "",
}) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [campusName, setCampusName] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [devResetToken, setDevResetToken] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const { errors, validate, clearError, clearErrors } = useFormValidation();

  useEffect(() => {
    setMode(initialMode);
    if (initialResetToken) {
      setResetToken(initialResetToken);
    }
    setError(null);
    setNotice(null);
    setDevResetToken("");
    setShowPassword(false);
  }, [initialMode, initialResetToken, isOpen]);

  useEffect(() => {
    clearErrors();
    setShowPassword(false);
  }, [mode, isOpen, clearErrors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !validate(e.currentTarget)) return;
    setError(null);
    setNotice(null);

    if (mode === "reset" && password !== confirmPassword) {
      setError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
        onClose();
      } else if (mode === "register") {
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
        onClose();
      } else if (mode === "forgot") {
        const res = await authApi.forgotPassword(email.trim());
        const msg =
          res?.data?.message ||
          res?.message ||
          "Jika email terdaftar, instruksi atur ulang kata sandi telah dikirim.";
        setNotice(msg);
        if (res?.data?.dev_token) {
          setDevResetToken(res.data.dev_token);
        }
      } else if (mode === "reset") {
        const res = await authApi.resetPassword({
          token: resetToken.trim(),
          new_password: password,
        });
        setPassword("");
        setConfirmPassword("");
        setResetToken("");
        setNotice(
          res?.message ||
            "Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda."
        );
        setMode("login");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memproses akun.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalHeading =
    mode === "login"
      ? "Masuk ke PeerLearn"
      : mode === "register"
      ? "Buat Akun Komunitas"
      : mode === "forgot"
      ? "Lupa Kata Sandi"
      : "Atur Ulang Kata Sandi";

  const modalSubtitle =
    mode === "login"
      ? "Akses grup belajar dan profil Anda"
      : mode === "register"
      ? "Bergabung bersama rekan mahasiswa dan tutor kampus"
      : mode === "forgot"
      ? "Masukkan email akun PeerLearn Anda untuk mendapatkan token pemulihan"
      : "Masukkan kode token dan kata sandi baru akun Anda";

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="auth-modal-title">
      <div className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2
              id="auth-modal-title"
              className="text-lg font-bold text-slate-900 tracking-tight"
            >
              {modalHeading}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{modalSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-10 min-h-10 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === "login" || mode === "register" ? (
          <div className="grid grid-cols-2 p-1 rounded-lg bg-slate-100 border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setNotice(null);
              }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === "login"
                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-bold"
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
                setNotice(null);
              }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === "register"
                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Daftar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setNotice(null);
              setDevResetToken("");
            }}
            className="min-h-[36px] inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Kembali ke Masuk</span>
          </button>
        )}

        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{notice}</span>
            </div>
            {devResetToken && mode === "forgot" && (
              <div className="p-2.5 rounded-lg bg-white border border-emerald-200 space-y-2">
                <p className="text-[11px] font-semibold text-emerald-900">
                  Mode Pengembangan Lokal (SMTP nonaktif):
                </p>
                <p className="font-mono text-[11px] text-slate-800 break-all bg-slate-50 px-2 py-1 rounded border border-slate-200">
                  {devResetToken}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setResetToken(devResetToken);
                    setNotice(null);
                    setMode("reset");
                  }}
                >
                  Lanjutkan ke Atur Ulang Kata Sandi
                </Button>
              </div>
            )}
          </div>
        )}

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
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-700 shrink-0" />
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
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-700 shrink-0" />
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
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                >
                  <option value="">Pilih jenis kelamin (opsional)</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>

              {role === "student" && (
                <>
                  <Input
                    label="Nama Kampus, Fakultas & Program Studi UIN SGD"
                    id="campus_name"
                    name="campus_name"
                    error={errors.campus_name}
                    placeholder="cth. UIN SGD Bandung - FST S1 Teknik Informatika"
                    value={campusName}
                    onChange={(e) => setCampusName(e.target.value)}
                    helperText="Pilih fakultas/prodi UIN SGD atau ketik nama institusi Anda"
                    list="uin-majors-list"
                  />
                  <datalist id="uin-majors-list">
                    {UIN_PROGRAM_OPTIONS.map((program) => (
                      <option key={program} value={program} />
                    ))}
                  </datalist>
                </>
              )}
            </>
          )}

          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <Input
              label="Alamat Email"
              id="email"
              name="email"
              error={errors.email}
              type="email"
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="nama@student.uinsgd.ac.id atau @uinsgd.ac.id"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}

          {mode === "reset" && (
            <Input
              label="Kode Token Pemulihan"
              id="reset_token"
              name="reset_token"
              error={errors.reset_token}
              type="text"
              autoComplete="one-time-code"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Tempel kode token pemulihan kata sandi"
              required
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
            />
          )}

          {(mode === "login" || mode === "register" || mode === "reset") && (
            <Input
              label={mode === "reset" ? "Kata Sandi Baru" : "Kata Sandi"}
              id="password"
              name="password"
              error={errors.password}
              minLength={mode === "register" || mode === "reset" ? 6 : undefined}
              helperText={
                mode === "register" || mode === "reset"
                  ? "Gunakan minimal 6 karakter."
                  : undefined
              }
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              placeholder={
                mode === "reset"
                  ? "Buat kata sandi baru"
                  : mode === "register"
                  ? "Buat kata sandi akun"
                  : "Masukkan kata sandi"
              }
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-pressed={showPassword}
                  className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded-lg"
                  aria-label={
                    showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                  title={
                    showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              }
            />
          )}

          {mode === "reset" && (
            <Input
              label="Ulangi Kata Sandi Baru"
              id="confirm_password"
              name="confirm_password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ketik ulang kata sandi baru"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}

          {mode === "login" && (
            <div className="flex items-center justify-between text-xs pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setNotice(null);
                }}
                className="font-semibold text-emerald-800 hover:text-emerald-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
              >
                Lupa kata sandi?
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("reset");
                  setError(null);
                  setNotice(null);
                }}
                className="font-medium text-slate-600 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
              >
                Sudah punya kode reset?
              </button>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2 min-h-[44px]"
            isLoading={loading}
          >
            {mode === "login"
              ? "Masuk ke Akun"
              : mode === "register"
              ? "Daftar Sekarang"
              : mode === "forgot"
              ? "Kirim Instruksi Pemulihan"
              : "Simpan Kata Sandi Baru"}
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500">
          Dengan melanjutkan, Anda menyetujui pedoman komunitas dan kolaborasi belajar PeerLearn.
        </div>
      </div>
    </Modal>
  );
}
