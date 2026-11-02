import React from 'react'
import { CircleAlert } from 'lucide-react'
import { Button } from './Button'

export function LoadError({ message, onRetry, isRetrying = false, hasStaleData = false }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl bg-rose-50 border border-rose-200 p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
      <div className="flex min-w-0 items-start gap-2.5">
        <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-rose-900">{message}</p>
          <p className="text-xs leading-relaxed text-rose-700">
            {hasStaleData
              ? 'Menampilkan data terakhir yang berhasil dimuat. Data ini mungkin belum terbaru.'
              : 'Periksa koneksi Anda, lalu coba lagi.'}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="min-h-10 shrink-0 border-rose-300 text-rose-800 hover:bg-rose-100/60"
        disabled={isRetrying}
        onClick={onRetry}
      >
        {isRetrying ? 'Mencoba lagi…' : 'Coba lagi'}
      </Button>
    </div>
  )
}
