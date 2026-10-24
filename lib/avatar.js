const TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
  "image/heic",
  "image/heif",
]);
const EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i;
export function validateAvatar(file) {
  if (
    !file ||
    !(
      TYPES.has(file.type) ||
      ((!file.type || file.type === "application/octet-stream") &&
        EXTENSIONS.test(file.name || ""))
    )
  )
    throw new Error("აირჩიე JPG, PNG, WebP, GIF, BMP, AVIF ან HEIC ფოტო.");
  if (!file.size || file.size > 50 * 1024 * 1024)
    throw new Error("ფოტოს ზომა უნდა იყოს მაქსიმუმ 50 MB.");
}
export async function normalizeAvatar(file) {
  validateAvatar(file);
  if (
    /image\/hei[cf]/i.test(file.type) ||
    /\.hei[cf]$/i.test(file.name || "")
  ) {
    try {
      const { default: convert } = await import("heic2any");
      const result = await convert({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      const blob = Array.isArray(result) ? result[0] : result;
      return new File([blob], "profile.jpg", { type: "image/jpeg" });
    } catch {
      throw new Error(
        "HEIC ფოტოს გარდაქმნა ვერ მოხერხდა. სცადე ამ ფოტოს JPG ვერსია.",
      );
    }
  }
  return file;
}
export function getAvatarCrop(
  width,
  height,
  zoom,
  offsetX,
  offsetY,
  viewport = 280,
) {
  if (
    ![width, height, zoom, offsetX, offsetY, viewport].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    zoom < 1 ||
    viewport <= 0
  )
    throw new Error("ფოტოს მოჭრის პარამეტრები არასწორია.");
  const scale = (viewport / Math.min(width, height)) * zoom;
  const size = Math.min(width, height) / zoom;
  return {
    x: Math.max(
      0,
      Math.min(width - size, (width - size) / 2 - offsetX / scale),
    ),
    y: Math.max(
      0,
      Math.min(height - size, (height - size) / 2 - offsetY / scale),
    ),
    size,
  };
}
export async function prepareAvatar(file, crop) {
  validateAvatar(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error("ფოტოს წაკითხვა ვერ მოხერხდა.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const side =
      crop?.size ?? Math.min(image.naturalWidth, image.naturalHeight);
    const x = crop?.x ?? (image.naturalWidth - side) / 2;
    const y = crop?.y ?? (image.naturalHeight - side) / 2;
    if (
      ![side, x, y].every(Number.isFinite) ||
      side <= 0 ||
      x < 0 ||
      y < 0 ||
      x + side > image.naturalWidth + 0.01 ||
      y + side > image.naturalHeight + 0.01
    )
      throw new Error("ფოტოს მოჭრის პარამეტრები არასწორია.");
    const context = canvas.getContext("2d");
    context.fillStyle = "#06100c";
    context.fillRect(0, 0, 512, 512);
    context.drawImage(image, x, y, side, side, 0, 0, 512, 512);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob || blob.type !== "image/jpeg" || blob.size > 1024 * 1024)
      throw new Error("ფოტოს დამუშავება ვერ მოხერხდა. სცადე სხვა ფოტო.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
