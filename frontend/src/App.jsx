import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MainLayout } from "./layouts/MainLayout";
import { HomePage } from "./pages/HomePage";
import { AuthModal } from "./components/auth/AuthModal";
import { SkillsModal } from "./components/profile/SkillsModal";
import { ProfileModal } from "./components/profile/ProfileModal";
import { CreateGroupModal } from "./components/groups/CreateGroupModal";
import { GroupDetailModal } from "./components/groups/GroupDetailModal";
import { MySessionsModal } from "./components/sessions/MySessionsModal";
import { FeedbackModal } from "./components/feedback/FeedbackModal";
import { ReportModal } from "./components/reports/ReportModal";
import { TutorSummaryModal } from "./components/profile/TutorSummaryModal";
import { PublicProfileModal } from "./components/profile/PublicProfileModal";
import { AdminModerationModal } from "./components/moderation/AdminModerationModal";
import { InfoGuideModal } from "./components/common/InfoGuideModal";
import { LoadError } from "./components/ui/LoadError";
import { Button } from "./components/ui/Button";

function AppContent() {
  const { profileError, loading, retryProfile } = useAuth();
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [mySessionsOpen, setMySessionsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [feedbackGroupId, setFeedbackGroupId] = useState(null);
  const [reportGroupId, setReportGroupId] = useState(null);
  const [reportTargetUser, setReportTargetUser] = useState(null);
  const [publicProfileTarget, setPublicProfileTarget] = useState(null);
  const [adminModerationOpen, setAdminModerationOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [guideModalTab, setGuideModalTab] = useState("ethics");
  const [tutorSummaryOpen, setTutorSummaryOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleOpenAuth = (mode = "login") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleGroupActionComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <MainLayout
      isBackendOnline={isBackendOnline}
      onOpenAuth={handleOpenAuth}
      onOpenSkills={() => setSkillsModalOpen(true)}
      onOpenProfile={() => setProfileModalOpen(true)}
      onOpenCreateGroup={() => setCreateGroupOpen(true)}
      onOpenMySessions={() => setMySessionsOpen(true)}
      onOpenTutorSummary={() => setTutorSummaryOpen(true)}
      onOpenModeration={() => setAdminModerationOpen(true)}
      onOpenGuide={(tab) => {
        setGuideModalTab(tab);
        setGuideModalOpen(true);
      }}
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
      <HomePage
        key={refreshTrigger}
        onStatusUpdate={setIsBackendOnline}
        onOpenAuth={handleOpenAuth}
        onOpenSkills={() => setSkillsModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenCreateGroup={() => setCreateGroupOpen(true)}
        onOpenGroupDetail={(group) => setSelectedGroup(group)}
        onOpenTutorSummary={() => setTutorSummaryOpen(true)}
        onOpenPublicProfile={(userId, initialData) =>
          setPublicProfileTarget({ userId, initialData })
        }
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      <SkillsModal
        isOpen={skillsModalOpen}
        onClose={() => setSkillsModalOpen(false)}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onOpenTutorSummary={() => setTutorSummaryOpen(true)}
      />

      <PublicProfileModal
        isOpen={!!publicProfileTarget}
        userId={publicProfileTarget?.userId}
        initialData={publicProfileTarget?.initialData}
        onClose={() => setPublicProfileTarget(null)}
        onReportUser={(user) => {
          setPublicProfileTarget(null);
          setReportTargetUser(user);
        }}
      />

      <TutorSummaryModal
        isOpen={tutorSummaryOpen}
        onClose={() => setTutorSummaryOpen(false)}
      />

      <CreateGroupModal
        isOpen={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreated={() => handleGroupActionComplete()}
      />

      <GroupDetailModal
        isOpen={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        group={selectedGroup}
        onActionComplete={handleGroupActionComplete}
        onOpenFeedback={(groupId) => setFeedbackGroupId(groupId)}
        onOpenReport={(groupId) => setReportGroupId(groupId)}
        onOpenAuth={handleOpenAuth}
        onOpenPublicProfile={(userId, initialData) =>
          setPublicProfileTarget({ userId, initialData })
        }
      />

      <MySessionsModal
        isOpen={mySessionsOpen}
        onClose={() => setMySessionsOpen(false)}
        onSelectGroup={(g) => setSelectedGroup(g)}
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

      <AdminModerationModal
        isOpen={adminModerationOpen}
        onClose={() => setAdminModerationOpen(false)}
        onModerated={handleGroupActionComplete}
      />

      <InfoGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        initialTab={guideModalTab}
      />
    </MainLayout>
  );
}

function AccountApp() {
  const { user, token, loading, profileError, retryProfile, logout } =
    useAuth();

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
