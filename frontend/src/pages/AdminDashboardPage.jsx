import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ClipboardCheck,
  MessageSquareText,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Clock3,
  BookOpen,
} from "lucide-react";
import { AdminLayout } from "../layouts/AdminLayout";
import { AdminApprovalsPanel } from "../components/admin/AdminApprovalsPanel";
import { AdminSupportInbox } from "../components/admin/AdminSupportInbox";
import { AdminModerationPanel } from "../components/admin/AdminModerationPanel";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  groupApi,
  engagementApi,
  supportApi,
  systemApi,
} from "../api/client";

export function AdminDashboardPage({
  onPreviewStudentCatalog,
  initialTab = "approvals",
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedApprovalId, setSelectedApprovalId] = useState(null);
  const [isBackendOnline, setIsBackendOnline] = useState(false);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState(null);

  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState(null);

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState(null);

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    setGroupsError(null);
    try {
      const res = await groupApi.adminList();
      if (!res.success) throw new Error("Gagal memuat data pengajuan sesi.");
      setGroups(res.data || []);
    } catch (err) {
      setGroupsError(err.message || "Gagal memuat antrean sesi belajar.");
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const fetchThreads = useCallback(async (silent = false) => {
    if (!silent) {
      setLoadingThreads(true);
      setThreadsError(null);
    }
    try {
      const res = await supportApi.adminListThreads();
      if (!res.success) throw new Error("Gagal memuat pesan bantuan.");
      setThreads(res.data || []);
    } catch (err) {
      if (!silent) {
        setThreadsError(err.message || "Gagal memuat pesan bantuan mahasiswa.");
      }
    } finally {
      if (!silent) {
        setLoadingThreads(false);
      }
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    setReportsError(null);
    try {
      const res = await engagementApi.listModeration();
      if (!res.success) throw new Error("Gagal memuat laporan moderasi.");
      setReports(res.data || []);
    } catch (err) {
      setReportsError(err.message || "Gagal memuat laporan moderasi.");
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }

  useEffect(() => {
    systemApi
      .getHealth()
      .then((res) => setIsBackendOnline(Boolean(res?.status === "healthy")))
      .catch(() => setIsBackendOnline(false));

    const loadAdminData = async () => {
      await Promise.all([fetchGroups(), fetchThreads(false), fetchReports()]);
    };
    loadAdminData();
  }, [fetchGroups, fetchThreads, fetchReports]);

  const handleTabChange = (tab) => {
    if (tab !== "approvals") {
      setSelectedApprovalId(null);
    }
    setActiveTab(tab);
  };

  const counts = useMemo(() => {
    const pendingApprovals = groups.filter(
      (g) => g.status === "pending_approval"
    ).length;
    const openSessions = groups.filter((g) => g.status === "open").length;
    const openThreads = threads.filter((t) => t.status === "open").length;
    const pendingModeration = reports.filter(
      (r) =>
        (r.report?.status || "pending") === "pending" ||
        r.reported_user?.account_status === "restricted"
    ).length;

    return {
      pendingApprovals,
      openSessions,
      openThreads,
      pendingModeration,
    };
  }, [groups, threads, reports]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    for (const g of groups) {
      const cat = g.category || "Lainnya";
      if (!map[cat]) {
        map[cat] = { category: cat, total: 0, pending: 0, open: 0 };
      }
      map[cat].total += 1;
      if (g.status === "pending_approval") map[cat].pending += 1;
      if (g.status === "open") map[cat].open += 1;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [groups]);

  return (
    <AdminLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      counts={counts}
      isBackendOnline={isBackendOnline}
      onPreviewStudentCatalog={onPreviewStudentCatalog}
    >
      {activeTab === "overview" && (
        <section aria-labelledby="overview-heading" className="space-y-6">
          <div>
            <h1
              id="overview-heading"
              className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight"
            >
              Ringkasan Operasional Komunitas UIN SGD
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Pantau pengajuan sesi belajar yang perlu diverifikasi, percakapan
              bantuan mahasiswa, serta laporan penegakan etika akademik.
            </p>
          </div>

          {/* Live Operational Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("approvals")}
              className="text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 transition-colors space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </span>
                <Badge variant="warning">Perlu ACC</Badge>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {counts.pendingApprovals}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Pengajuan Sesi Menunggu Kurasi
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("support")}
              className="text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 transition-colors space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                  <MessageSquareText className="w-5 h-5" />
                </span>
                <Badge variant="primary">Shared Inbox</Badge>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {counts.openThreads}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Percakapan Bantuan Terbuka
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("moderation")}
              className="text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-rose-400 transition-colors space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <Badge variant="danger">Moderasi</Badge>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {counts.pendingModeration}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Laporan & Akun Perlu Tinjauan
                </p>
              </div>
            </button>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <Badge variant="success">Tayang Publik</Badge>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {counts.openSessions}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Sesi Belajar Aktif di Katalog
                </p>
              </div>
            </div>
          </div>

          {/* Two-Column Summary: Category Distribution & Recent Pending */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  Sebaran Rumpun Ilmu & Prodi
                </h2>
                <span className="text-xs text-slate-500">
                  Total {groups.length} sesi
                </span>
              </div>

              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Belum ada data sesi tercatat.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {categoryBreakdown.map((row) => (
                    <div
                      key={row.category}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-bold text-slate-800">
                        {row.category}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {row.pending > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold">
                            {row.pending} menunggu
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-semibold">
                          {row.open} tayang
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-amber-600" />
                  Pengajuan Terbaru Menunggu Verifikasi
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("approvals")}
                  className="text-xs text-emerald-800"
                >
                  Buka Antrean
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              {groups.filter((g) => g.status === "pending_approval").length ===
              0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Seluruh pengajuan sesi sudah ditinjau.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {groups
                    .filter((g) => g.status === "pending_approval")
                    .slice(0, 5)
                    .map((g) => (
                      <div
                        key={g.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {g.title}
                          </p>
                          <p className="text-xs text-slate-600 truncate">
                            {g.host?.full_name || "Mahasiswa"} ({g.category})
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApprovalId(g.id);
                            setActiveTab("approvals");
                          }}
                          className="shrink-0 text-xs"
                        >
                          Periksa Detail
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === "approvals" && (
        <AdminApprovalsPanel
          groups={groups}
          loading={loadingGroups}
          error={groupsError}
          initialSelectedId={selectedApprovalId}
          onRefresh={fetchGroups}
          onReviewed={async () => {
            setSelectedApprovalId(null);
            await fetchGroups();
          }}
        />
      )}

      {activeTab === "support" && (
        <AdminSupportInbox
          threads={threads}
          loading={loadingThreads}
          error={threadsError}
          onRefresh={fetchThreads}
        />
      )}

      {activeTab === "moderation" && (
        <AdminModerationPanel
          items={reports}
          loading={loadingReports}
          error={reportsError}
          onRefresh={fetchReports}
          onModerated={fetchReports}
        />
      )}
    </AdminLayout>
  );
}
