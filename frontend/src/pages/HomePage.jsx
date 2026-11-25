import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  BookOpen,
  Sparkles,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { GroupCard } from "../components/groups/GroupCard";
import { LoadError } from "../components/ui/LoadError";
import { AccountStatusBanner } from "../components/home/AccountStatusBanner";
import { HomeHeroSection } from "../components/home/HomeHeroSection";
import { CatalogFilterBar } from "../components/home/CatalogFilterBar";
import { IntegrityPillarsSection } from "../components/home/IntegrityPillarsSection";
import { groupApi, systemApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useMasterCatalog } from "../hooks/useMasterCatalog";

const CATEGORIES = [
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

const PRIMARY_CATEGORIES = [
  "Semua",
  "Teknologi",
  "Teknik Elektro",
  "Teknik Lingkungan",
  "Matematika",
];

const PAGE_SIZE = 6;

export function HomePage({
  onStatusUpdate,
  onOpenAuth,
  onOpenSkills,
  onOpenCreateGroup,
  onOpenGroupDetail,
  onOpenPublicProfile,
}) {
  const { user, isAuthenticated } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState(false);
  const groupsRequest = useRef(0);
  const [category, setCategory] = useState("Semua");
  const [format, setFormat] = useState("all");
  const [facultyId, setFacultyId] = useState("all");
  const masterCatalog = useMasterCatalog(true);
  const [search, setSearch] = useState("");
  const [catalogView, setCatalogView] = useState("all");
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(false);
  const recommendationsRequest = useRef(0);

  const fetchGroups = async () => {
    const requestId = ++groupsRequest.current;
    setLoadingGroups(true);
    try {
      const res = await groupApi.list({
        category: category !== "Semua" ? category : undefined,
        format: format !== "all" ? format : undefined,
        search: search.trim() || undefined,
        ...(facultyId !== "all" ? { faculty_id: facultyId } : {}),
      });
      if (requestId !== groupsRequest.current) return;
      if (!res.success) throw new Error("Catalog request failed");
      setGroups(res.data || []);
      setGroupsError(false);
    } catch {
      if (requestId === groupsRequest.current) setGroupsError(true);
    } finally {
      if (requestId === groupsRequest.current) setLoadingGroups(false);
    }
  };

  const fetchRecommendations = async () => {
    if (!isAuthenticated) return;
    const requestId = ++recommendationsRequest.current;
    setLoadingRecs(true);
    try {
      const res = await groupApi.getRecommendations();
      if (requestId !== recommendationsRequest.current) return;
      if (!res.success) throw new Error("Recommendations request failed");
      setRecommendations(res.data || []);
      setRecommendationsError(false);
    } catch {
      if (requestId === recommendationsRequest.current)
        setRecommendationsError(true);
    } finally {
      if (requestId === recommendationsRequest.current) setLoadingRecs(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await systemApi.getHealth();
      if (res.success) {
        onStatusUpdate(true);
      }
    } catch {
      onStatusUpdate(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchGroups();
    return () => {
      groupsRequest.current += 1;
    };
  }, [category, format, facultyId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecommendations();
    }
    return () => {
      recommendationsRequest.current += 1;
    };
  }, [isAuthenticated, user?.skills]);

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchGroups();
  };

  const masteredSkills =
    user?.skills?.filter((s) => s.skill_type === "mastered") || [];
  const learningSkills =
    user?.skills?.filter((s) => s.skill_type === "learning") || [];

  const visibleCategories = isCategoriesExpanded
    ? CATEGORIES
    : PRIMARY_CATEGORIES.includes(category)
      ? PRIMARY_CATEGORIES
      : [...PRIMARY_CATEGORIES, category];

  const hiddenCategoryCount = CATEGORIES.length - PRIMARY_CATEGORIES.length;
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedGroups = groups.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <AccountStatusBanner user={user} />

      <HomeHeroSection
        user={user}
        isAuthenticated={isAuthenticated}
        masteredSkills={masteredSkills}
        learningSkills={learningSkills}
        onOpenAuth={onOpenAuth}
        onOpenSkills={onOpenSkills}
      />

      {/* Explore & Filter Catalog */}
      <section id="katalog-sesi" className="space-y-4">
        <CatalogFilterBar
          isAuthenticated={isAuthenticated}
          search={search}
          onSearchChange={setSearch}
          onSearchSubmit={handleSearchSubmit}
          catalogView={catalogView}
          onCatalogViewChange={setCatalogView}
          recommendationsCount={recommendations.length}
          onFetchRecommendations={fetchRecommendations}
          format={format}
          onFormatChange={setFormat}
          category={category}
          onCategoryChange={setCategory}
          visibleCategories={visibleCategories}
          isCategoriesExpanded={isCategoriesExpanded}
          onToggleCategories={() => setIsCategoriesExpanded((prev) => !prev)}
          hiddenCategoryCount={hiddenCategoryCount}
        />

        {catalogView === "all" && masterCatalog.faculties?.length > 0 && (
          <div
            role="group"
            aria-label="Filter fakultas"
            className="flex items-center gap-2 overflow-x-auto pb-1"
          >
            <button
              type="button"
              onClick={() => setFacultyId("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${
                facultyId === "all"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              Semua Fakultas
            </button>
            {masterCatalog.faculties.map((fac) => (
              <button
                key={fac.id}
                type="button"
                onClick={() => setFacultyId(fac.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${
                  facultyId === fac.id
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-800"
                }`}
              >
                {fac.code} — {fac.name}
              </button>
            ))}
          </div>
        )}

        {catalogView === "recommendations" ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5 text-xs text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  Sesi berikut dicocokkan otomatis berdasarkan target materi
                  belajar Anda dan keahlian tutor penyelenggara.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSkills}
                className="shrink-0 text-xs border-emerald-300 bg-white hover:bg-emerald-100/50 text-emerald-800 self-start sm:self-auto"
              >
                Perbarui Minat Belajar
              </Button>
            </div>

            {recommendationsError && (
              <LoadError
                message="Rekomendasi belum dapat dimuat."
                onRetry={fetchRecommendations}
                isRetrying={loadingRecs}
                hasStaleData={recommendations.length > 0}
              />
            )}
            {loadingRecs && (
              <p role="status" className="text-sm text-slate-500">
                {recommendations.length > 0
                  ? "Memperbarui rekomendasi. Menampilkan data terakhir sementara."
                  : "Memuat rekomendasi sesi belajar..."}
              </p>
            )}
            {loadingRecs && recommendations.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse p-5 space-y-3"
                  >
                    <div className="w-20 h-4 bg-slate-200 rounded"></div>
                    <div className="w-3/4 h-5 bg-slate-200 rounded"></div>
                    <div className="w-full h-12 bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : recommendationsError &&
              recommendations.length === 0 ? null : learningSkills.length ===
              0 ? (
              <div className="py-14 text-center rounded-2xl bg-white border border-slate-200 p-8 space-y-4 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900">
                    Belum Ada Minat Belajar yang Ditentukan
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tentukan topik materi kuliah yang ingin Anda pelajari agar
                    sistem dapat menemukan tutor rekan sebaya yang tepat.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenSkills}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  <BookOpen className="w-4 h-4" />
                  Atur Materi Belajar
                </Button>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="py-14 text-center rounded-2xl bg-white border border-slate-200 p-8 space-y-4 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900">
                    Belum Ada Sesi yang Cocok
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Belum ada kelompok belajar aktif untuk materi yang Anda cari
                    (
                    {learningSkills
                      .map((s) => s.skill?.name)
                      .filter(Boolean)
                      .join(", ")}
                    ). Buka sesi baru atau ajak rekan kampus!
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenCreateGroup}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  <PlusCircle className="w-4 h-4" />
                  Buka Sesi Belajar Topik Ini
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {recommendations.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onClick={() => onOpenGroupDetail(group)}
                    onViewProfile={onOpenPublicProfile}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {groupsError && (
              <LoadError
                message="Sesi belajar belum dapat dimuat."
                onRetry={fetchGroups}
                isRetrying={loadingGroups}
                hasStaleData={groups.length > 0}
              />
            )}
            {loadingGroups && (
              <p role="status" className="text-sm text-slate-500">
                {groups.length > 0
                  ? "Memperbarui katalog sesi. Menampilkan data terakhir sementara."
                  : "Memuat sesi belajar..."}
              </p>
            )}
            {loadingGroups && groups.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse p-5 space-y-3"
                  >
                    <div className="w-20 h-4 bg-slate-200 rounded"></div>
                    <div className="w-3/4 h-5 bg-slate-200 rounded"></div>
                    <div className="w-full h-12 bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : groupsError && groups.length === 0 ? null : groups.length ===
              0 ? (
              <div className="py-14 text-center rounded-2xl bg-white border border-slate-200 p-8 space-y-4 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-slate-900">
                    Belum Ada Sesi Belajar di Kategori Ini
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tidak ada sesi yang cocok dengan kriteria pencarian atau
                    filter Anda saat ini.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCategory("Semua");
                    setFormat("all");
                    setSearch("");
                    setFacultyId("all");
                  }}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Reset Semua Filter
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {paginatedGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onClick={() => onOpenGroupDetail(group)}
                      onViewProfile={onOpenPublicProfile}
                    />
                  ))}
                </div>

                {groups.length > PAGE_SIZE && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80 text-xs text-slate-600">
                    <span>
                      Menampilkan{" "}
                      <strong className="text-slate-900">
                        {(safeCurrentPage - 1) * PAGE_SIZE + 1}–
                        {Math.min(safeCurrentPage * PAGE_SIZE, groups.length)}
                      </strong>{" "}
                      dari{" "}
                      <strong className="text-slate-900">
                        {groups.length}
                      </strong>{" "}
                      sesi belajar
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safeCurrentPage <= 1}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className="px-2.5 py-1 min-h-[34px] text-xs"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Sebelumnya
                      </Button>

                      <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
                        {safeCurrentPage} / {totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="px-2.5 py-1 min-h-[34px] text-xs"
                      >
                        Berikutnya
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <IntegrityPillarsSection />
    </div>
  );
}
