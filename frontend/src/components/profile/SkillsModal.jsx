import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Check,
  BookOpen,
  Sparkles,
  AlertCircle,
  Plus,
  Search,
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { userApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const CATEGORY_TABS = [
  "Semua",
  "Teknologi",
  "Teknik Elektro",
  "Teknik Lingkungan",
  "Matematika",
  "Fisika",
  "Kimia",
  "Biologi",
  "Agroteknologi",
  "Sains Data",
  "Desain",
  "Bahasa",
  "Soft Skills",
];

export function SkillsModal({ isOpen, onClose }) {
  const { user, refreshProfile } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'mastered' | 'learning'

  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("Teknologi");
  const [addingCustom, setAddingCustom] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      setFeedbackNotice(null);
      try {
        const res = await userApi.getSkills();
        if (res.success) {
          setCatalog(res.data);
        }

        const initialMap = {};
        if (user?.skills) {
          user.skills.forEach((us) => {
            initialMap[us.skill_id] = us.skill_type;
          });
        }
        setSelectedSkills(initialMap);
      } catch (err) {
        setError(err.message || "Gagal memuat katalog keahlian");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, user]);

  const toggleSkill = (skillId, targetType) => {
    setSelectedSkills((prev) => {
      const current = prev[skillId];
      const next = { ...prev };
      if (current === targetType) {
        delete next[skillId];
      } else {
        next[skillId] = targetType;
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = Object.entries(selectedSkills).map(
        ([skillId, skillType]) => ({
          skill_id: skillId,
          skill_type: skillType,
        }),
      );
      await userApi.updateSkills(payload);
      await refreshProfile();
      onClose();
    } catch (err) {
      setError(err.message || "Gagal menyimpan pilihan keahlian");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAdd = async (nameToAdd, skillType, categoryToAdd = "Teknologi") => {
    const trimmed = (nameToAdd || "").trim();
    if (!trimmed) return;

    setAddingCustom(true);
    setError(null);
    setFeedbackNotice(null);
    try {
      const res = await userApi.addCustomSkill({
        name: trimmed,
        category: categoryToAdd,
        skill_type: skillType,
      });
      if (res.success && res.data) {
        const newSkill = res.data;
        setCatalog((prev) => {
          if (prev.some((s) => s.id === newSkill.id)) return prev;
          return [newSkill, ...prev];
        });
        setSelectedSkills((prev) => ({
          ...prev,
          [newSkill.id]: skillType,
        }));
        setCustomName("");
        setFeedbackNotice(
          `Mata kuliah "${trimmed}" berhasil ditambahkan dan ditandai sebagai ${
            skillType === "mastered" ? "Dikuasai" : "Ingin Dipelajari"
          }.`,
        );
        await refreshProfile();
      }
    } catch (err) {
      setError(err.message || "Gagal menambahkan mata kuliah/keahlian");
    } finally {
      setAddingCustom(false);
    }
  };

  const masteredCount = Object.values(selectedSkills).filter(
    (v) => v === "mastered",
  ).length;
  const learningCount = Object.values(selectedSkills).filter(
    (v) => v === "learning",
  ).length;

  const categoryCounts = useMemo(() => {
    const counts = { Semua: catalog.length };
    catalog.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return catalog.filter((skill) => {
      const matchesSearch =
        !query ||
        skill.name.toLowerCase().includes(query) ||
        skill.category.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === "Semua" || skill.category === selectedCategory;

      const userStatus = selectedSkills[skill.id];
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "mastered" && userStatus === "mastered") ||
        (statusFilter === "learning" && userStatus === "learning");

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [catalog, searchQuery, selectedCategory, statusFilter, selectedSkills]);

  const groupedFilteredSkills = useMemo(() => {
    return filteredCatalog.reduce((acc, skill) => {
      acc[skill.category] = acc[skill.category] || [];
      acc[skill.category].push(skill);
      return acc;
    }, {});
  }, [filteredCatalog]);

  const hasExactMatchInCatalog = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return catalog.some((s) => s.name.toLowerCase() === query);
  }, [catalog, searchQuery]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="skills-modal-title">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2
                  id="skills-modal-title"
                  className="text-base font-bold text-slate-900 tracking-tight"
                >
                  Kelola Minat & Keahlian Belajar
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-medium text-blue-700">
                    Fakultas Sains & Teknologi • UIN SGD Bandung
                  </span>
                  <span>•</span>
                  <span>Tutor Sebaya & Kolaborasi Belajar</span>
                </div>
              </div>
            </div>
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

        {/* Status Tracker & Overview */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Semua ({catalog.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("mastered")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === "mastered"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Dikuasai ({masteredCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("learning")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === "learning"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              Ingin Belajar ({learningCount})
            </button>
          </div>

          <span className="text-[11px] text-slate-500 hidden md:inline">
            Tandai <strong>Kuasai</strong> untuk berbagi ilmu, atau <strong>Belajar</strong> untuk mencari kelompok belajar.
          </span>
        </div>

        {/* Live Search and Quick Add Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari mata kuliah FST UIN SGD atau ketik mata kuliah/keahlian baru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Hapus pencarian"
                aria-label="Hapus kata kunci pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Instant Quick-Add Action Strip (Triggered directly as user types) */}
          {searchQuery.trim().length > 0 && !hasExactMatchInCatalog && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="text-xs">
                  <span className="text-slate-600">Keahlian baru:</span>{" "}
                  <span className="font-semibold text-slate-900">
                    "{searchQuery.trim()}"
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAdd(
                      searchQuery.trim(),
                      "mastered",
                      selectedCategory !== "Semua" ? selectedCategory : "Teknologi",
                    )
                  }
                  disabled={addingCustom}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  + Kuasai (Tutor)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAdd(
                      searchQuery.trim(),
                      "learning",
                      selectedCategory !== "Semua" ? selectedCategory : "Teknologi",
                    )
                  }
                  disabled={addingCustom}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Ingin Pelajari
                </button>
              </div>
            </div>
          )}

          {/* Feedback notice */}
          {feedbackNotice && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedbackNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 p-0.5"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Filter Tabs Scrollable */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {CATEGORY_TABS.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Course Cards Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Advanced Custom Skill Form Accordion */}
          <div className="border border-slate-200 rounded-xl bg-slate-50/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedForm(!showAdvancedForm)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-slate-800 hover:bg-slate-100/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Form Tambah Keahlian dengan Kategori Khusus</span>
              </div>
              {showAdvancedForm ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showAdvancedForm && (
              <div className="p-4 pt-1 border-t border-slate-200 bg-white space-y-3">
                <p className="text-[11px] text-slate-500">
                  Masukkan judul mata kuliah spesifik atau topik riset Anda beserta rumpun ilmu yang relevan.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: Pemrograman Sistem Tertanam, Analisis Runtun Waktu..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                  />
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="px-2.5 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                  >
                    <option value="Teknologi">Teknologi (Informatika)</option>
                    <option value="Teknik Elektro">Teknik Elektro</option>
                    <option value="Teknik Lingkungan">Teknik Lingkungan</option>
                    <option value="Matematika">Matematika</option>
                    <option value="Fisika">Fisika</option>
                    <option value="Kimia">Kimia</option>
                    <option value="Biologi">Biologi</option>
                    <option value="Agroteknologi">Agroteknologi</option>
                    <option value="Sains Data">Sains Data</option>
                    <option value="Desain">Desain</option>
                    <option value="Bahasa">Bahasa</option>
                    <option value="Soft Skills">Soft Skills</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleQuickAdd(customName, "mastered", customCategory)
                    }
                    disabled={addingCustom || !customName.trim()}
                    className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Tambah ke Dikuasai
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      handleQuickAdd(customName, "learning", customCategory)
                    }
                    disabled={addingCustom || !customName.trim()}
                    className="text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah ke Minat Belajar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Memuat daftar kurikulum keahlian...
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-800">
                {searchQuery
                  ? `Mata kuliah atau topik "${searchQuery}" belum ada di daftar kurikulum.`
                  : "Belum ada mata kuliah pada kategori yang dipilih."}
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Anda dapat langsung menambahkannya sebagai keahlian kustom secara bebas menggunakan tombol di atas.
              </p>
            </div>
          ) : (
            Object.entries(groupedFilteredSkills).map(([catName, items]) => (
              <div key={catName} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>{catName}</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      ({items.length})
                    </span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((skill) => {
                    const status = selectedSkills[skill.id];
                    return (
                      <div
                        key={skill.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          status === "mastered"
                            ? "bg-emerald-50/80 border-emerald-300 shadow-2xs"
                            : status === "learning"
                              ? "bg-blue-50/80 border-blue-300 shadow-2xs"
                              : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <p className="text-xs font-medium text-slate-900 leading-snug truncate">
                            {skill.name}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            {skill.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleSkill(skill.id, "mastered")}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                              status === "mastered"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                            }`}
                            title="Tandai sebagai Dikuasai"
                          >
                            Kuasai
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSkill(skill.id, "learning")}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                              status === "learning"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                            }`}
                            title="Tandai sebagai Ingin Dipelajari"
                          >
                            Belajar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="text-xs text-slate-600 hidden sm:block">
            <span>Total dipilih: </span>
            <strong className="text-slate-900">
              {masteredCount + learningCount} keahlian
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={saving}
            >
              <Check className="w-4 h-4" />
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
