import React, { useState } from "react";
import { X, Flag, Check, AlertCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { engagementApi } from "../../api/client";

export function ReportModal({ isOpen, onClose, targetGroupId, targetUser }) {
  const [reason, setReason] = useState(
    "Penyalahgunaan Platform / Bukan Kegiatan Belajar",
  );
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        reason,
        details,
      };
      if (targetGroupId) {
        payload.target_group_id = targetGroupId;
      }
      if (targetUser?.id) {
        payload.reported_user_id = targetUser.id;
      }

      const res = await engagementApi.createReport(payload);
      if (res.success) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Gagal mengirim laporan");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalTitle = targetUser ? "Laporkan Pengguna" : "Laporkan Sesi Belajar";

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="report-title">
      <div className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-rose-600" />
            <div>
              <h2
                id="report-title"
                className="text-base font-bold text-slate-900 tracking-tight"
              >
                {modalTitle}
              </h2>
              {targetUser && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Terkait: {targetUser.full_name}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={onClose}
            className="min-w-10 min-h-10 shrink-0 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">
              Laporan Berhasil Terkirim
            </p>
            <p className="text-xs text-slate-500">
              Tim pengelola akan segera meninjau laporan Anda.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="report_reason"
                className="block text-xs font-medium text-slate-700"
              >
                Alasan Pelaporan
              </label>
              <select
                id="report_reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              >
                <option value="Penyalahgunaan Platform / Bukan Kegiatan Belajar">
                  Penyalahgunaan Platform / Bukan Kegiatan Belajar
                </option>
                <option value="Konten Tidak Pantas atau Melanggar Norma">
                  Konten Tidak Pantas atau Melanggar Norma
                </option>
                <option value="Penipuan / Meminta Pembayaran di Luar Sistem">
                  Penipuan / Meminta Pembayaran di Luar Sistem
                </option>
                <option value="Perilaku Tidak Sopan / Gangguan">
                  Perilaku Tidak Sopan / Gangguan
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="report_details"
                className="block text-xs font-medium text-slate-700"
              >
                Keterangan Tambahan
              </label>
              <textarea
                id="report_details"
                rows={3}
                placeholder="Jelaskan detail kejadian untuk membantu proses moderasi..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 placeholder:text-slate-400"
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
                variant="danger"
                size="sm"
                type="submit"
                isLoading={loading}
              >
                Kirim Laporan
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
