export const MAX_AVATAR_BASE64_LENGTH = 60000;

export async function compressImageFile(file, maxDimension = 256) {
  if (!file) {
    throw new Error("Berkas foto tidak ditemukan.");
  }

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!validTypes.includes(file.type) && !file.type.startsWith("image/")) {
    throw new Error("Format berkas harus berupa gambar (JPG, PNG, atau WebP).");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca berkas gambar."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memproses gambar yang dipilih."));
      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          if (!width || !height) {
            return reject(new Error("Dimensi gambar tidak valid."));
          }

          const minSide = Math.min(width, height);
          const sx = (width - minSide) / 2;
          const sy = (height - minSide) / 2;

          const targetSize = Math.min(minSide, maxDimension);

          const canvas = document.createElement("canvas");
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            return reject(new Error("Canvas context tidak didukung pada peramban ini."));
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

          let quality = 0.82;
          let mime = "image/webp";
          let dataUrl = canvas.toDataURL(mime, quality);

          if (!dataUrl.startsWith("data:image/webp")) {
            mime = "image/jpeg";
            dataUrl = canvas.toDataURL(mime, quality);
          }

          if (dataUrl.length > MAX_AVATAR_BASE64_LENGTH) {
            dataUrl = canvas.toDataURL("image/jpeg", 0.65);
          }

          if (dataUrl.length > MAX_AVATAR_BASE64_LENGTH) {
            const smallCanvas = document.createElement("canvas");
            const smallSize = 160;
            smallCanvas.width = smallSize;
            smallCanvas.height = smallSize;
            const smallCtx = smallCanvas.getContext("2d");
            if (smallCtx) {
              smallCtx.drawImage(canvas, 0, 0, smallSize, smallSize);
              dataUrl = smallCanvas.toDataURL("image/jpeg", 0.6);
            }
          }

          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
