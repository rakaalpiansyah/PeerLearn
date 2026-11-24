import React from "react";
import { AlertTriangle, UserX } from "lucide-react";

export function AccountStatusBanner({ user }) {
  if (!user) return null;

  if (user.account_status === "restricted") {
    return (
      <div
        role="alert"
        className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-xs"
      >
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-sm text-amber-950">
            Akun Anda Dibatasi Sementara oleh Sistem
          </p>
          <p className="text-amber-800">
            Akun Anda menerima pembatasan sementara karena adanya 3 laporan atau
            lebih dalam 7 hari terakhir yang sedang ditinjau administrator. Anda
            belum dapat membuka sesi baru atau bergabung ke sesi lain selama
            masa peninjauan.
          </p>
          {user.restriction_note && (
            <p className="italic bg-amber-100/70 p-2 rounded-lg border border-amber-200 mt-1">
              Catatan: {user.restriction_note}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (user.account_status === "suspended") {
    return (
      <div
        role="alert"
        className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3 shadow-xs"
      >
        <UserX className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-sm text-rose-950">
            Akun Ditangguhkan oleh Administrator
          </p>
          <p className="text-rose-800">
            Akses akun Anda telah dinonaktifkan karena pelanggaran kebijakan
            komunitas FST.
          </p>
          {user.restriction_note && (
            <p className="italic bg-rose-100/70 p-2 rounded-lg border border-rose-200 mt-1">
              Alasan: {user.restriction_note}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
