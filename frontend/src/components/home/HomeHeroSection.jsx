import React from "react";
import {
  BookOpen,
  ArrowRight,
  GraduationCap,
  Users,
  Award,
  Calendar,
  ListOrdered,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { UserAvatar } from "../ui/UserAvatar";

export function HomeHeroSection({
  user,
  isAuthenticated,
  masteredSkills,
  learningSkills,
  onOpenAuth,
  onOpenSkills,
}) {
  if (isAuthenticated) {
    return (
      <section className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <UserAvatar
              user={user}
              size="lg"
              className="w-12 h-12 sm:w-14 sm:h-14 text-sm sm:text-base ring-2 ring-emerald-100 shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  {user.full_name}
                </h1>
                <Badge variant="success" className="text-[11px] py-0.5">
                  {user.role === "student" ? (
                    <>
                      <GraduationCap className="w-3 h-3" />
                      Mahasiswa Terverifikasi
                    </>
                  ) : (
                    <>
                      <Users className="w-3 h-3" />
                      Komunitas Kampus
                    </>
                  )}
                </Badge>
              </div>

              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                {user.campus_name ||
                  "Fakultas Sains & Teknologi, UIN Sunan Gunung Djati Bandung"}
              </p>

              {user.bio && (
                <p className="text-xs text-slate-600 leading-relaxed pt-0.5 max-w-2xl">
                  {user.bio}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold inline-flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{user.contribution_points || 0} Poin Tutor</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSkills}
              className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              Atur Keahlian
            </Button>
          </div>
        </div>

        {/* Skills Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3.5 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Keahlian Membimbing (Tutor)
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200/80">
                {masteredSkills.length} topik
              </span>
            </div>
            {masteredSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {masteredSkills.map((s) => (
                  <span
                    key={s.skill_id}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-700 text-white shadow-2xs"
                  >
                    {s.skill?.name || "Keahlian"}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Belum ada keahlian tutor yang dipilih.{" "}
                <button
                  type="button"
                  onClick={onOpenSkills}
                  className="text-emerald-700 font-semibold underline underline-offset-2 hover:text-emerald-800 cursor-pointer"
                >
                  Tambah keahlian
                </button>
              </p>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Target Materi yang Dipelajari
              </span>
              <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {learningSkills.length} topik
              </span>
            </div>
            {learningSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {learningSkills.map((s) => (
                  <span
                    key={s.skill_id}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-emerald-900 border border-emerald-200 shadow-2xs"
                  >
                    {s.skill?.name || "Materi"}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Belum ada target materi belajar.{" "}
                <button
                  type="button"
                  onClick={onOpenSkills}
                  className="text-emerald-700 font-semibold underline underline-offset-2 hover:text-emerald-800 cursor-pointer"
                >
                  Pilih materi
                </button>
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative p-6 sm:p-10 lg:p-12 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            Fakultas Sains & Teknologi — UIN Sunan Gunung Djati Bandung
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Belajar Bareng Rekan <br className="hidden sm:inline" />
            <span className="text-slate-900">Mahasiswa FST, </span>
            <span className="text-emerald-600">Tanpa Biaya.</span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
            Wadah kolaborasi akademis untuk 8 Program Studi FST UIN Sunan Gunung
            Djati Bandung. Temukan rekan belajar responsi praktikum
            laboratorium, bedah tugas koding & riset sains, persiapan UTS/UAS,
            dan bangun portofolio SKPI.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onOpenAuth("register")}
              className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs px-6 py-3 font-semibold text-sm sm:text-base"
            >
              Mulai Belajar Bersama
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const el = document.getElementById("katalog-sesi");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="border-slate-300 text-slate-800 hover:bg-slate-50 px-6 py-3 font-semibold text-sm sm:text-base shadow-2xs"
            >
              Jelajahi Katalog
            </Button>
          </div>

          {/* Social Proof Trust Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs">
            <div className="space-y-0.5">
              <p className="text-sm font-extrabold text-slate-900 tracking-tight">
                100%
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Bebas Biaya
              </p>
            </div>
            <div className="space-y-0.5 sm:border-l sm:border-slate-200 sm:pl-3">
              <p className="text-sm font-extrabold text-slate-900 tracking-tight">
                Daring & Luring
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Fleksibel
              </p>
            </div>
            <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
              <p className="text-sm font-extrabold text-slate-900 tracking-tight">
                Verifikasi Email
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Resmi Kampus
              </p>
            </div>
            <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
              <p className="text-sm font-extrabold text-slate-900 tracking-tight">
                Portofolio
              </p>
              <p className="text-[11px] text-emerald-800 font-semibold">
                Bukti SKPI
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Study Session Card Preview */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="relative w-full max-w-sm sm:max-w-md">
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Teknologi
                </span>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50/70 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Pendaftaran Terbuka
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Algoritma & Struktur Data
                </h2>
                <div className="flex items-center gap-2.5 mt-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
                    DP
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Dimas Pratama
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      S1 Teknik Informatika — FST UIN SGD
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-2 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Sabtu, 14:00 - 16:00 WIB</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-emerald-600" />
                  Agenda Pembahasan
                </p>
                <ul className="text-xs text-slate-600 space-y-1.5 pl-5 list-disc marker:text-emerald-600">
                  <li>Pembahasan konsep rekursi & dynamic programming</li>
                  <li>Latihan bedah soal & live code review</li>
                  <li>Tanya jawab persiapan ujian kuliah</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Kuota Peserta
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  4 / 5 Terisi
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
