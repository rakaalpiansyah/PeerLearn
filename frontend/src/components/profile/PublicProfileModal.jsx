import React, { useState, useEffect } from "react";
import {
  X,
  GraduationCap,
  Users,
  Award,
  BookOpen,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { UserAvatar } from "../ui/UserAvatar";
import { userApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export function PublicProfileModal({
  isOpen,
  userId,
  initialData = null,
  onClose,
  onReportUser,
}) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    userApi
      .getPublicProfile(userId)
      .then((res) => {
        if (isMounted && res.data) {
          setProfile(res.data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err.message || "Gagal memuat profil pengguna. Silakan coba lagi.",
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const masteredSkills = profile?.skills?.filter((s) => s.is_mastered) || [];
  const learningSkills = profile?.skills?.filter((s) => !s.is_mastered) || [];
  const isSelf = currentUser && currentUser.id === userId;

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="public-profile-title">
      <div className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2
            id="public-profile-title"
            className="text-base font-bold text-slate-900 tracking-tight"
          >
            Profil Rekan Komunitas
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-10 min-h-10 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && !profile && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-500">Memuat data profil...</p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setLoading(true);
                userApi
                  .getPublicProfile(userId)
                  .then((res) => setProfile(res.data))
                  .catch((err) => setError(err.message))
                  .finally(() => setLoading(false));
              }}
              className="text-xs py-1 px-2.5 h-7"
            >
              Coba Lagi
            </Button>
          </div>
        )}

        {profile && (
          <div className="space-y-5">
            {/* User Hero Banner */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3.5 sm:gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between sm:block">
                <UserAvatar
                  user={{
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url,
                    gender: profile.gender,
                  }}
                  size="xl"
                  className="ring-4 ring-white shadow-sm sm:w-16 sm:h-16 sm:text-lg"
                />
                <div className="inline-flex sm:hidden items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>{profile.contribution_points || 0} Poin Tutor</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {profile.full_name}
                  </h3>
                  {profile.role === "student" ? (
                    <Badge variant="primary" className="text-[10px] py-0.5">
                      <GraduationCap className="w-3 h-3" />
                      Mahasiswa FST
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="text-[10px] py-0.5">
                      <Users className="w-3 h-3" />
                      Masyarakat
                    </Badge>
                  )}
                  {profile.gender === "female" && (
                    <Badge variant="outline" className="text-[10px] py-0.5 text-rose-700 border-rose-200 bg-rose-50/50">
                      Perempuan
                    </Badge>
                  )}
                  {profile.gender === "male" && (
                    <Badge variant="outline" className="text-[10px] py-0.5 text-sky-700 border-sky-200 bg-sky-50/50">
                      Laki-laki
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-2">
                  {profile.campus_name || "Fakultas Sains & Teknologi • UIN SGD Bandung"}
                </p>

                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>{profile.contribution_points || 0} Poin Kontribusi Tutor</span>
                </div>
              </div>
            </div>

            {/* Account status note if restricted */}
            {profile.account_status === "restricted" && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Akun pengguna ini sedang dalam peninjauan moderasi komunitas.</span>
              </div>
            )}

            {/* Bio Section */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Tentang / Bio Belajar
              </h4>
              <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed min-h-[50px]">
                {profile.bio?.trim() ? (
                  profile.bio
                ) : (
                  <span className="text-slate-400 italic">
                    Belum menuliskan deskripsi singkat atau bio belajar.
                  </span>
                )}
              </div>
            </div>

            {/* Skills: Mastered / Can Tutor */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Keahlian yang Dikuasai (Siap Bimbing Sebaya):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {masteredSkills.length > 0 ? (
                  masteredSkills.map((s, idx) => (
                    <span
                      key={s.id || idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                    >
                      {s.name}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Belum menandai keahlian tutor.
                  </p>
                )}
              </div>
            </div>

            {/* Skills: Learning / Interested */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Topik yang Sedang Dipelajari:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {learningSkills.length > 0 ? (
                  learningSkills.map((s, idx) => (
                    <span
                      key={s.id || idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"
                    >
                      {s.name}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Belum memilih topik yang ingin dipelajari.
                  </p>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                {!isSelf && onReportUser && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onReportUser(profile);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:underline py-1.5 px-2 rounded-lg hover:bg-rose-50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Laporkan Pengguna
                  </button>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={onClose}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
