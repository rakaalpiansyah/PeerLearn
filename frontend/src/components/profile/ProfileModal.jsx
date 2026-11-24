import React, { useState, useEffect, useRef } from "react";
import { X, User, Check, AlertCircle, Award, Upload, Trash2, CheckCircle2, Mail } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { UserAvatar } from "../ui/UserAvatar";
import { authApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useFormValidation } from "../../hooks/useFormValidation";
import { compressImageFile } from "../../utils/imageCompressor";
import { UIN_PROGRAM_OPTIONS } from "../../data/campusData";

export function ProfileModal({ isOpen, onClose, onOpenTutorSummary }) {
  const { user, updateProfile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [campusName, setCampusName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verifyTokenInput, setVerifyTokenInput] = useState("");
  const [verifyMessage, setVerifyMessage] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [devVerifyToken, setDevVerifyToken] = useState("");
  const [requestingVerify, setRequestingVerify] = useState(false);
  const [confirmingVerify, setConfirmingVerify] = useState(false);
  const { errors, validate, clearError, clearErrors } = useFormValidation();
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.full_name || "");
      setCampusName(user.campus_name || "");
      setBio(user.bio || "");
      setGender(user.gender || "");
      setAvatarUrl(user.avatar_url || "");
      setAvatarRemoved(false);
      setError(null);
    }
  }, [user, isOpen]);

  useEffect(() => {
    clearErrors();
  }, [isOpen, clearErrors]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setCompressing(true);
    try {
      const compressedDataUrl = await compressImageFile(file);
      setAvatarUrl(compressedDataUrl);
      setAvatarRemoved(false);
    } catch (err) {
      setError(err.message || "Gagal mengompres gambar.");
    } finally {
      setCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl("");
    setAvatarRemoved(true);
  };

  const handleRequestEmailVerification = async () => {
    setRequestingVerify(true);
    setVerifyError(null);
    setVerifyMessage(null);
    try {
      const res = await authApi.requestEmailVerification();
      setVerifyMessage(
        res?.data?.message ||
          res?.message ||
          "Kode verifikasi telah dikirim ke email kampus Anda."
      );
      if (res?.data?.dev_token) {
        setDevVerifyToken(res.data.dev_token);
        setVerifyTokenInput(res.data.dev_token);
      }
    } catch (err) {
      setVerifyError(err?.message || "Gagal mengirim kode verifikasi email kampus.");
    } finally {
      setRequestingVerify(false);
    }
  };

  const handleConfirmEmailVerification = async (e) => {
    e.preventDefault();
    const trimmed = verifyTokenInput.trim();
    if (!trimmed) {
      setVerifyError("Masukkan kode verifikasi email terlebih dahulu.");
      return;
    }
    setConfirmingVerify(true);
    setVerifyError(null);
    setVerifyMessage(null);
    try {
      const res = await authApi.confirmEmailVerification(trimmed);
      if (res?.success) {
        setDevVerifyToken("");
        setVerifyTokenInput("");
        setVerifyMessage("Email kampus berhasil diverifikasi.");
        await refreshProfile?.();
      }
    } catch (err) {
      setVerifyError(err?.message || "Kode verifikasi tidak valid atau kedaluwarsa.");
    } finally {
      setConfirmingVerify(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !validate(e.currentTarget)) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        full_name: fullName.trim(),
        campus_name: campusName.trim(),
        bio,
      };
      if (gender) {
        payload.gender = gender;
      }
      if (avatarUrl) {
        payload.avatar_url = avatarUrl;
      } else if (avatarRemoved) {
        payload.avatar_url = "";
      }

      await updateProfile(payload);
      onClose();
    } catch (err) {
      setError(err.message || "Gagal menyimpan profil");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="profile-modal-title">
      <div className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-700" />
            <h2
              id="profile-modal-title"
              className="text-base font-bold text-slate-900 tracking-tight"
            >
              Edit Profil Pengguna
            </h2>
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

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Tutor Points & SKPI Summary Card */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                {user?.contribution_points || 0} Poin Kontribusi Tutor
              </p>
              <p className="text-[10px] text-amber-700">
                Portofolio pendampingan & pengabdian sebaya
              </p>
            </div>
          </div>
          {onOpenTutorSummary && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                onClose();
                onOpenTutorSummary();
              }}
              className="border-amber-300 text-amber-900 hover:bg-amber-100/70"
            >
              Cetak SKPI
            </Button>
          )}
        </div>

        {/* Campus Email Verification Card */}
        {user?.email && (
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span className="font-mono text-[11px] text-slate-800 truncate">
                  {user.email}
                </span>
              </div>
              {user.email_verified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                  <span>Email Kampus Terverifikasi</span>
                </span>
              ) : user.is_campus_email ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleRequestEmailVerification}
                  isLoading={requestingVerify}
                  className="text-xs"
                >
                  Verifikasi Email Kampus
                </Button>
              ) : (
                <span className="text-[11px] text-slate-500">
                  Lencana khusus email `@uinsgd.ac.id`
                </span>
              )}
            </div>

            {verifyError && (
              <p role="alert" className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                {verifyError}
              </p>
            )}

            {verifyMessage && (
              <p role="status" aria-live="polite" className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                {verifyMessage}
              </p>
            )}

            {!user.email_verified && (devVerifyToken || verifyMessage) && user.is_campus_email && (
              <form onSubmit={handleConfirmEmailVerification} className="space-y-2 pt-1">
                {devVerifyToken && (
                  <p className="font-mono text-[10px] text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1 rounded break-all">
                    Token lokal: {devVerifyToken}
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="verify-email-token-input"
                      className="block text-[11px] font-semibold text-slate-700 mb-1"
                    >
                      Masukkan Kode Verifikasi
                    </label>
                    <input
                      id="verify-email-token-input"
                      type="text"
                      value={verifyTokenInput}
                      onChange={(e) => setVerifyTokenInput(e.target.value)}
                      placeholder="Tempel kode verifikasi"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="w-full min-h-[40px] px-2.5 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={confirmingVerify}
                    className="min-h-[40px] shrink-0"
                  >
                    Konfirmasi Kode
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Avatar Upload Preview Section */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-4">
          <UserAvatar
            user={{ full_name: fullName, avatar_url: avatarUrl, gender }}
            size="xl"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800">
              Foto Profil Akun
            </p>
            <p className="text-[10px] text-slate-500 mb-2">
              Dikompres otomatis di peramban (&lt; 30 KB)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={compressing || loading}
                className="text-xs py-1 px-2.5 h-8 gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                {compressing ? "Mengompres..." : "Pilih Foto"}
              </Button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:underline px-1.5 py-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              id="avatar_file_input"
              aria-label="Pilih foto profil dari perangkat"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        <form
          noValidate
          onChangeCapture={clearError}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <Input
            label="Nama Lengkap"
            id="edit_full_name"
            name="full_name"
            error={errors.full_name}
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <div className="space-y-1.5">
            <label
              htmlFor="edit_gender"
              className="block text-xs font-medium text-slate-700"
            >
              Jenis Kelamin (Opsional)
            </label>
            <select
              id="edit_gender"
              name="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            >
              <option value="">Tidak Disebutkan</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
          </div>

          {user?.role === "student" && (
            <>
              <Input
                label="Institusi, Fakultas & Program Studi UIN SGD"
                id="edit_campus_name"
                name="campus_name"
                error={errors.campus_name}
                placeholder="cth. UIN SGD Bandung - FST S1 Teknik Informatika"
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
                helperText="Pilih fakultas/prodi UIN SGD atau ketik nama institusi Anda"
                list="edit-uin-majors-list"
              />
              <datalist id="edit-uin-majors-list">
                {UIN_PROGRAM_OPTIONS.map((program) => (
                  <option key={program} value={program} />
                ))}
              </datalist>
            </>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="bio"
              className="block text-xs font-medium text-slate-700"
            >
              Deskripsi Singkat / Bio Belajar
            </label>
            <textarea
              id="bio"
              rows={3}
              placeholder="Ceritakan latar belakang akademik atau topik yang Anda minati..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 placeholder:text-slate-400"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClose}
              disabled={loading}
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
              Simpan Profil
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
