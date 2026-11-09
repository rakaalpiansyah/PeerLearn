import React, { useState } from "react";
import { User } from "lucide-react";

const SIZES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
  "2xl": "w-20 h-20 text-xl font-bold",
};

export function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({ user, size = "md", className = "" }) {
  const [imgFailed, setImgFailed] = useState(false);

  const fullName = user?.full_name || "";
  const avatarUrl = user?.avatar_url;
  const gender = user?.gender;
  const initials = getInitials(fullName);
  const sizeClass = SIZES[size] || SIZES.md;

  const getGenderTheme = () => {
    if (gender === "female") {
      return "bg-rose-50 text-rose-700 border-rose-200 ring-rose-100";
    }
    if (gender === "male") {
      return "bg-sky-50 text-sky-700 border-sky-200 ring-sky-100";
    }
    return "bg-slate-100 text-slate-700 border-slate-200 ring-slate-100";
  };

  if (avatarUrl && !imgFailed) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-slate-200 bg-slate-50 ${sizeClass} ${className}`}
      >
        <img
          src={avatarUrl}
          alt={fullName ? `Foto profil ${fullName}` : "Foto profil pengguna"}
          loading="lazy"
          decoding="async"
          width="48"
          height="48"
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`inline-flex items-center justify-center shrink-0 rounded-full border font-semibold select-none ${getGenderTheme()} ${sizeClass} ${className}`}
    >
      {initials ? initials : <User className="w-1/2 h-1/2" />}
    </div>
  );
}
