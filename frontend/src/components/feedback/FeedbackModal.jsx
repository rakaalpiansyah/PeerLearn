import React, { useState } from "react";
import { X, Star, Check, AlertCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { engagementApi } from "../../api/client";

export function FeedbackModal({
  isOpen,
  onClose,
  groupId,
  onFeedbackSubmitted,
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await engagementApi.createFeedback(groupId, {
        rating,
        comment,
      });
      if (res.success) {
        onFeedbackSubmitted();
        onClose();
      }
    } catch (err) {
      setError(err.message || "Gagal mengirimkan ulasan.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="feedback-title">
      <div className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2
              id="feedback-title"
              className="text-base font-bold text-slate-900 tracking-tight"
            >
              Ulasan & Apresiasi Tutor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Beri feedback konstruktif untuk mendukung budaya belajar sebaya
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={onClose}
            className="min-w-10 min-h-10 shrink-0 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-center py-2">
            <label className="block text-xs font-semibold text-slate-700">
              Penilaian Kualitas Bimbingan
            </label>
            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} dari 5 bintang`}
                  aria-pressed={rating === star}
                  onClick={() => setRating(star)}
                  className="min-w-10 min-h-10 inline-flex items-center justify-center p-1 text-slate-300 hover:text-amber-500 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating
                        ? "text-amber-500 fill-amber-400"
                        : "text-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-amber-700">
              {rating === 5 && "Sangat Membantu & Jelas! ⭐⭐⭐⭐⭐"}
              {rating === 4 && "Bagus & Bermanfaat ⭐⭐⭐⭐"}
              {rating === 3 && "Cukup Memadai ⭐⭐⭐"}
              {rating === 2 && "Perlu Peningkatan ⭐⭐"}
              {rating === 1 && "Kurang Memuaskan ⭐"}
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="feedback_comment"
              className="block text-xs font-medium text-slate-700"
            >
              Ulasan & Catatan Singkat
            </label>
            <textarea
              id="feedback_comment"
              rows={3}
              placeholder="Ceritakan pengalaman belajar bersama rekan tutor ini..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 placeholder:text-slate-400"
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
              Kirim Ulasan
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
