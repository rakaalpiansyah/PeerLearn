import React, { useMemo } from "react";
import QRCode from "qrcode";

export function SKPIQrCode({ url, size = 88 }) {
  const matrix = useMemo(() => {
    if (!url) return null;
    try {
      const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
      const dim = qr.modules.size;
      const cells = [];
      for (let r = 0; r < dim; r += 1) {
        for (let c = 0; c < dim; c += 1) {
          if (qr.modules.get(r, c)) {
            cells.push({ x: c, y: r });
          }
        }
      }
      return { dim, cells };
    } catch {
      return null;
    }
  }, [url]);

  if (!matrix) return null;

  return (
    <div className="inline-flex flex-col items-center gap-1 p-2 rounded-xl bg-white border border-slate-200 print:border-slate-400">
      <svg
        role="img"
        aria-label="QR Code Verifikasi SKPI PeerLearn"
        viewBox={`0 0 ${matrix.dim} ${matrix.dim}`}
        width={size}
        height={size}
        shapeRendering="crispEdges"
        className="block"
      >
        <rect width={matrix.dim} height={matrix.dim} fill="#ffffff" />
        {matrix.cells.map((cell) => (
          <rect
            key={`${cell.x}-${cell.y}`}
            x={cell.x}
            y={cell.y}
            width={1}
            height={1}
            fill="#0f172a"
          />
        ))}
      </svg>
      <span className="text-[9px] font-semibold text-slate-600 print:text-black text-center leading-tight">
        Pindai Verifikasi SKPI
      </span>
    </div>
  );
}
