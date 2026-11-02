import React from 'react'

export function Badge({
  children,
  variant = 'neutral',
  className = '',
}) {
  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-emerald-50/70 text-emerald-800 border-emerald-200',
    purple: 'bg-teal-50 text-teal-800 border-teal-200',
    outline: 'bg-white text-slate-700 border-slate-200',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-tight ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
