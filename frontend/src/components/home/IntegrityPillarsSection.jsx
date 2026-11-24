import React from "react";
import { ShieldCheck, Users, GraduationCap, Award } from "lucide-react";

export function IntegrityPillarsSection() {
  return (
    <section
      id="komitmen-integritas"
      className="space-y-4 pt-6 border-t border-slate-200"
    >
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Komitmen Integritas Komunitas Belajar Sebaya
        </h2>
        <p className="text-xs text-slate-500">
          Prinsip utama interaksi dan pendampingan akademik mahasiswa di
          platform PeerLearn
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              100% Bebas Biaya & Nirlaba
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              Diinisiasi oleh sesama rekan mahasiswa atas dasar kepedulian
              akademik, tanpa pungutan biaya belajar apapun.
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Verifikasi Identitas Kampus
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              Menghubungkan rekan belajar satu almamater dan sekitarnya
              menggunakan email institusi terpercaya (.ac.id).
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Portofolio Kontribusi (SKPI)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              Setiap dedikasi tutor diakui resmi dan dapat dicetak sebagai bukti
              Surat Keterangan Pendamping Ijazah.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
