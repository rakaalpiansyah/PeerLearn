import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { groupApi } from "./api/client";
import {
  clearSessionPath,
  clearSKPIVerifyPath,
  getSessionIdFromPath,
  getSKPIVerifyIdFromPath,
  pushSessionPath,
} from "./utils/sessionRoute";
import { MainLayout } from "./layouts/MainLayout";
import { HomePage } from "./pages/HomePage";
import { AuthModal } from "./components/auth/AuthModal";
import { GroupDetailModal } from "./components/groups/GroupDetailModal";
import { FeedbackModal } from "./components/feedback/FeedbackModal";
import { ReportModal } from "./components/reports/ReportModal";
import { LoadError } from "./components/ui/LoadError";
import { Button } from "./components/ui/Button";

const AdminDashboardPage = lazy(() =>
  import("./pages/AdminDashboardPage").then((m) => ({
    default: m.AdminDashboardPage,
  }))
);
const SKPIVerifyPage = lazy(() =>
  import("./pages/SKPIVerifyPage").then((m) => ({ default: m.SKPIVerifyPage }))
);
const SkillsModal = lazy(() =>
  import("./components/profile/SkillsModal").then((m) => ({
    default: m.SkillsModal,
  }))
);
const ProfileModal = lazy(() =>
  import("./components/profile/ProfileModal").then((m) => ({
    default: m.ProfileModal,
  }))
);
const CreateGroupModal = lazy(() =>
  import("./components/groups/CreateGroupModal").then((m) => ({
    default: m.CreateGroupModal,
  }))
);
const MySessionsModal = lazy(() =>
  import("./components/sessions/MySessionsModal").then((m) => ({
    default: m.MySessionsModal,
  }))
);
const TutorSummaryModal = lazy(() =>
  import("./components/profile/TutorSummaryModal").then((m) => ({
    default: m.TutorSummaryModal,
  }))
);
const PublicProfileModal = lazy(() =>
  import("./components/profile/PublicProfileModal").then((m) => ({
    default: m.PublicProfileModal,
  }))
);
const StudentSupportModal = lazy(() =>
  import("./components/support/StudentSupportModal").then((m) => ({
    default: m.StudentSupportModal,
  }))
);
const InfoGuideModal = lazy(() =>
  import("./components/common/InfoGuideModal").then((m) => ({
    default: m.InfoGuideModal,
  }))
);

function AppContent() {
  const { user, profileError, loading, retryProfile } = useAuth();
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [previewStudentCatalog, setPreviewStudentCatalog] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authResetToken, setAuthResetToken] = useState("");
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [prefillStudyRequest, setPrefillStudyRequest] = useState(null);
  const [mySessionsOpen, setMySessionsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [feedbackGroupId, setFeedbackGroupId] = useState(null);
  const [reportGroupId, setReportGroupId] = useState(null);
  const [reportTargetUser, setReportTargetUser] = useState(null);
  const [publicProfileTarget, setPublicProfileTarget] = useState(null);
  const [adminInitialTab, setAdminInitialTab] = useState("approvals");
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [guideModalTab, setGuideModalTab] = useState("ethics");
  const [tutorSummaryOpen, setTutorSummaryOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deepLinkLoading, setDeepLinkLoading] = useState(false);
  const [deepLinkError, setDeepLinkError] = useState(null);

  const handleOpenAuth = (mode = "login") => {
    setAuthResetToken("");
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleGroupActionComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const openGroupById = useCallback(
    async (groupId, { syncUrl = true } = {}) => {
      if (!groupId) return;
      setDeepLinkLoading(true);
      setDeepLinkError(null);
      try {
        const res = await groupApi.getByID(groupId);
        if (!res?.success || !res?.data) {
          throw new Error("Sesi belajar tidak ditemukan.");
        }
        setSelectedGroup(res.data);
        if (syncUrl) {
          pushSessionPath(res.data.id || groupId);
        }
      } catch (err) {
        setSelectedGroup(null);
        setDeepLinkError(
          err?.message ||
            "Tautan sesi belajar tidak ditemukan atau sudah tidak tersedia."
        );
      } finally {
        setDeepLinkLoading(false);
      }
    },
    []
  );

  const handleOpenGroupDetail = (group) => {
    if (!group) return;
    setDeepLinkError(null);
    setSelectedGroup(group);
    pushSessionPath(group.id);
  };

  const handleCloseGroupDetail = () => {
    setSelectedGroup(null);
    clearSessionPath();
  };

  useEffect(() => {
    const queryResetToken = new URLSearchParams(window.location.search).get("reset_token");
    if (queryResetToken) {
      setAuthResetToken(queryResetToken);
      setAuthMode("reset");
      setAuthModalOpen(true);
      const nextUrl = `${window.location.pathname}${window.location.hash || ""}`;
      window.history.replaceState({}, "", nextUrl || "/");
    }

    const initialSessionId = getSessionIdFromPath(window.location.pathname);
    if (initialSessionId) {
      openGroupById(initialSessionId, { syncUrl: false });
    }

    const handlePopState = () => {
      const routeSessionId = getSessionIdFromPath(window.location.pathname);
      if (routeSessionId) {
        openGroupById(routeSessionId, { syncUrl: false });
      } else {
        setSelectedGroup(null);
        setDeepLinkError(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [openGroupById]);

  if (user?.role === "admin" && !previewStudentCatalog) {
    return (
      <Suspense
        fallback={
          <div
            role="status"
            className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-sm text-slate-600"
          >
            Memuat ruang kendali admin...
          </div>
        }
      >
        <AdminDashboardPage
          initialTab={adminInitialTab}
          onPreviewStudentCatalog={() => setPreviewStudentCatalog(true)}
        />
      </Suspense>
    );
  }

  return (
    <>
      {user?.role === "admin" && previewStudentCatalog && (
        <div className="bg-slate-900 text-white px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
          <span>
            Anda sedang melihat tampilan pratinjau katalog mahasiswa.
          </span>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setPreviewStudentCatalog(false)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
          >
            Kembali ke Ruang Kendali Admin
          </Button>
        </div>
      )}
      <MainLayout
        isBackendOnline={isBackendOnline}
        onOpenAuth={handleOpenAuth}
        onOpenSkills={() => setSkillsModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenCreateGroup={() => {
          setEditingGroup(null);
          setCreateGroupOpen(true);
        }}
        onOpenMySessions={() => setMySessionsOpen(true)}
        onOpenTutorSummary={() => setTutorSummaryOpen(true)}
        onOpenModeration={() => {
          setAdminInitialTab("moderation");
          setPreviewStudentCatalog(false);
        }}
        onOpenSupport={() => setSupportModalOpen(true)}
        onOpenGuide={(tab) => {
          setGuideModalTab(tab);
          setGuideModalOpen(true);
        }}
        onOpenGroupById={(groupId) => openGroupById(groupId, { syncUrl: true })}
        refreshTrigger={refreshTrigger}
      >
      {profileError && (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <LoadError
            message={profileError}
            onRetry={() => retryProfile()}
            isRetrying={loading}
            hasStaleData
          />
        </div>
      )}
      {deepLinkLoading && (
        <div
          role="status"
          className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"
        >
          <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 font-medium">
            Memuat detail sesi belajar...
          </div>
        </div>
      )}
      {deepLinkError && (
        <div
          role="alert"
          className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"
        >
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium">
              {deepLinkError}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDeepLinkError(null);
                clearSessionPath();
              }}
            >
              Kembali ke Katalog
            </Button>
          </div>
        </div>
      )}
      <HomePage
        key={refreshTrigger}
        onStatusUpdate={setIsBackendOnline}
        onOpenAuth={handleOpenAuth}
        onOpenSkills={() => setSkillsModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenCreateGroup={() => {
          setEditingGroup(null);
          setPrefillStudyRequest(null);
          setCreateGroupOpen(true);
        }}
        onOpenGroupDetail={handleOpenGroupDetail}
        onOpenTutorSummary={() => setTutorSummaryOpen(true)}
        onOpenPublicProfile={(userId, initialData) =>
          setPublicProfileTarget({ userId, initialData })
        }
        onOpenGroupById={(groupId) => openGroupById(groupId, { syncUrl: true })}
        onFulfillStudyRequest={(reqItem) => {
          setEditingGroup(null);
          setPrefillStudyRequest(reqItem);
          setCreateGroupOpen(true);
        }}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthResetToken("");
        }}
        initialMode={authMode}
        initialResetToken={authResetToken}
      />

      <GroupDetailModal
        isOpen={!!selectedGroup}
        onClose={handleCloseGroupDetail}
        group={selectedGroup}
        onActionComplete={handleGroupActionComplete}
        onOpenFeedback={(groupId) => setFeedbackGroupId(groupId)}
        onOpenReport={(groupId) => setReportGroupId(groupId)}
        onOpenAuth={handleOpenAuth}
        onOpenPublicProfile={(userId, initialData) =>
          setPublicProfileTarget({ userId, initialData })
        }
        onEditGroup={(groupToEdit) => {
          handleCloseGroupDetail();
          setEditingGroup(groupToEdit);
          setCreateGroupOpen(true);
        }}
      />

      <FeedbackModal
        isOpen={!!feedbackGroupId}
        onClose={() => setFeedbackGroupId(null)}
        groupId={feedbackGroupId}
        onFeedbackSubmitted={handleGroupActionComplete}
      />

      <ReportModal
        isOpen={!!reportGroupId || !!reportTargetUser}
        onClose={() => {
          setReportGroupId(null);
          setReportTargetUser(null);
        }}
        targetGroupId={reportGroupId}
        targetUser={reportTargetUser}
      />

      <Suspense fallback={null}>
        {skillsModalOpen && (
          <SkillsModal
            isOpen={skillsModalOpen}
            onClose={() => setSkillsModalOpen(false)}
          />
        )}

        {profileModalOpen && (
          <ProfileModal
            isOpen={profileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            onOpenTutorSummary={() => setTutorSummaryOpen(true)}
          />
        )}

        {!!publicProfileTarget && (
          <PublicProfileModal
            isOpen={!!publicProfileTarget}
            userId={publicProfileTarget?.userId}
            initialData={publicProfileTarget?.initialData}
            onClose={() => setPublicProfileTarget(null)}
            onReportUser={(targetUser) => {
              setPublicProfileTarget(null);
              setReportTargetUser(targetUser);
            }}
          />
        )}

        {tutorSummaryOpen && (
          <TutorSummaryModal
            isOpen={tutorSummaryOpen}
            onClose={() => setTutorSummaryOpen(false)}
          />
        )}

        {createGroupOpen && (
          <CreateGroupModal
            isOpen={createGroupOpen}
            editingGroup={editingGroup}
            prefillRequest={prefillStudyRequest}
            onClose={() => {
              setCreateGroupOpen(false);
              setEditingGroup(null);
              setPrefillStudyRequest(null);
            }}
            onCreated={() => handleGroupActionComplete()}
          />
        )}

        {mySessionsOpen && (
          <MySessionsModal
            isOpen={mySessionsOpen}
            onClose={() => setMySessionsOpen(false)}
            onSelectGroup={handleOpenGroupDetail}
          />
        )}

        {guideModalOpen && (
          <InfoGuideModal
            isOpen={guideModalOpen}
            onClose={() => setGuideModalOpen(false)}
            initialTab={guideModalTab}
          />
        )}

        {supportModalOpen && (
          <StudentSupportModal
            isOpen={supportModalOpen}
            onClose={() => setSupportModalOpen(false)}
          />
        )}
      </Suspense>
      </MainLayout>
    </>
  );
}

function AccountApp() {
  const { user, token, loading, profileError, retryProfile, logout } =
    useAuth();
  const [skpiVerifyId, setSkpiVerifyId] = useState(() =>
    getSKPIVerifyIdFromPath(window.location.pathname)
  );

  useEffect(() => {
    const syncVerifyRoute = () => {
      setSkpiVerifyId(getSKPIVerifyIdFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", syncVerifyRoute);
    return () => window.removeEventListener("popstate", syncVerifyRoute);
  }, []);

  if (skpiVerifyId) {
    return (
      <Suspense
        fallback={
          <div
            role="status"
            className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-sm text-slate-600"
          >
            Memuat halaman verifikasi SKPI...
          </div>
        }
      >
        <SKPIVerifyPage
          userId={skpiVerifyId}
          onBackHome={() => {
            clearSKPIVerifyPath();
            setSkpiVerifyId(null);
          }}
        />
      </Suspense>
    );
  }

  if (token && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12 text-slate-900">
        <section
          className="w-full max-w-lg space-y-6"
          aria-labelledby="session-heading"
        >
          <div className="space-y-2">
            <h1
              id="session-heading"
              className="text-2xl font-bold tracking-tight text-slate-900"
            >
              Kembali ke PeerLearn
            </h1>
            <p className="text-base leading-relaxed text-slate-600">
              Kami memeriksa sesi sebelum menampilkan akun Anda.
            </p>
          </div>
          {profileError ? (
            <LoadError
              message={profileError}
              onRetry={() => retryProfile()}
              isRetrying={loading}
            />
          ) : (
            <div
              role="status"
              aria-label="Memeriksa sesi"
              className="space-y-4"
            >
              <p className="text-sm text-slate-600">Memeriksa sesi…</p>
              <div
                aria-hidden="true"
                className="space-y-3 motion-safe:animate-pulse"
              >
                <div className="h-6 w-2/3 rounded bg-slate-200" />
                <div className="h-16 rounded-xl bg-slate-200" />
              </div>
            </div>
          )}
          <Button variant="ghost" className="min-h-10 text-slate-600 hover:text-slate-900" onClick={logout}>
            Gunakan akun lain
          </Button>
        </section>
      </main>
    );
  }

  // Discard cached lists, drafts, and pending dialogs when the account changes.
  return <AppContent key={user?.id ?? "guest"} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AccountApp />
    </AuthProvider>
  );
}
