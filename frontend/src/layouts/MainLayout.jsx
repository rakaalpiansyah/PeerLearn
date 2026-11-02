import React from "react";
import { Navbar } from "../components/common/Navbar";
import { Footer } from "../components/common/Footer";

export function MainLayout({
  children,
  isBackendOnline,
  onOpenAuth,
  onOpenSkills,
  onOpenProfile,
  onOpenCreateGroup,
  onOpenMySessions,
  onOpenTutorSummary,
  onOpenModeration,
  onOpenGuide,
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:font-semibold focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Lewati ke konten utama
      </a>
      <Navbar
        isBackendOnline={isBackendOnline}
        onOpenAuth={onOpenAuth}
        onOpenSkills={onOpenSkills}
        onOpenProfile={onOpenProfile}
        onOpenCreateGroup={onOpenCreateGroup}
        onOpenMySessions={onOpenMySessions}
        onOpenTutorSummary={onOpenTutorSummary}
        onOpenModeration={onOpenModeration}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 lg:py-10 pb-24 md:pb-10 focus:outline-none"
      >
        {children}
      </main>
      <Footer onOpenGuide={onOpenGuide} />
    </div>
  );
}
