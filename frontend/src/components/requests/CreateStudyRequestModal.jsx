import React, { useRef, useState } from "react";
import { AlertCircle, BookOpen, MapPin, Video, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { studyRequestApi } from "../../api/client";
import { SESSION_CATEGORIES } from "../../data/campusData";

export function CreateStudyRequestModal({ isOpen, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Teknologi");
  const [preferredFormat, setPreferredFormat] = useState("online");
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      setFieldError("Judul topik belajar minimal 3 karakter.");
      titleRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError(null);
    setFieldError(null);
    try {
      const res = await studyRequestApi.create({
        title: trimmedTitle,
        description: description.trim(),
        category,
        preferred_format: preferredFormat,
      });
      if (res?.success && res?.data) {
        setTitle("");
        setDescription("");
        setCategory("Teknologi");
        setPreferredFormat("online");
        onCreated?.(res.data);
        onClose();
      } else {
        throw new Error(res?.message || "Gagal mengirim usulan topik belajar.");
      }
    } catch (err) {
      setError(err?.message || "Gagal mengirim usulan topik belajar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="create-study-request-title">
      <div className="relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="shrink-0 flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
            <h2
              id="create-study-request-title"
              className="text-base font-bold text-slate-900 truncate"
            >
              Usulkan Topik Belajar Baru
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="min-w-10 min-h-10 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <Input
            ref={titleRef}
            id="sr-title-input"
            label="Judul Topik atau Mata Kuliah"
            required
            value={title}
            maxLength={160}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            placeholder="cth. Klinik Olah Data SPSS / Rujukan Kitab Ushul Fiqh"
            error={fieldError}
          />

          <div>
            <label
              htmlFor="sr-category-select"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Rumpun Ilmu / Kategori
            </label>
            <select
              id="sr-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700"
            >
              {SESSION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">
              Format Pertemuan yang Diharapkan
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
              <label
                htmlFor="sr-format-online"
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                  preferredFormat === "online"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-900"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  id="sr-format-online"
                  name="preferred_format"
                  type="radio"
                  value="online"
                  checked={preferredFormat === "online"}
                  onChange={() => setPreferredFormat("online")}
                  className="accent-emerald-700"
                />
                <Video className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>Daring (Online)</span>
              </label>

              <label
                htmlFor="sr-format-offline"
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                  preferredFormat === "offline"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-900"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  id="sr-format-offline"
                  name="preferred_format"
                  type="radio"
                  value="offline"
                  checked={preferredFormat === "offline"}
                  onChange={() => setPreferredFormat("offline")}
                  className="accent-emerald-700"
                />
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>Luring Kampus</span>
              </label>
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="sr-desc-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Catatan Materi yang Dibutuhkan (Opsional)
            </label>
            <textarea
              id="sr-desc-input"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan bab, soal praktikum, atau kendala belajar yang ingin dibahas bersama..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting} className="min-h-[44px]">
              Kirim Usulan Topik
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
