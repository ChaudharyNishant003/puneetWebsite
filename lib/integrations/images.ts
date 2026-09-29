import "server-only";
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["video/mp4", "mp4"],
]);
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 40 * 1024 * 1024;

export const imagesAreMock = () => !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET;

// Check magic bytes so a renamed file can't pass as an image.
function sniff(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(4, 8).toString() === "ftyp") return "video/mp4";
  return null;
}

export async function uploadMedia(file: File, folder: "products" | "reviews" | "cms"): Promise<{ url: string } | { error: string }> {
  if (!file || file.size === 0) return { error: "No file" };
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || !ALLOWED.has(type)) return { error: "Only JPG, PNG, WebP images or MP4 videos are allowed" };
  const isVideo = type.startsWith("video/");
  if (buf.length > (isVideo ? MAX_VIDEO : MAX_IMAGE)) return { error: isVideo ? "Video must be under 40 MB" : "Image must be under 10 MB" };

  if (imagesAreMock()) {
    const dir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ALLOWED.get(type)}`;
    await writeFile(path.join(dir, name), buf);
    return { url: `/uploads/${folder}/${name}` };
  }

  const ts = Math.floor(Date.now() / 1000);
  const params = `folder=puneet/${folder}&timestamp=${ts}`;
  const signature = crypto.createHash("sha1").update(params + process.env.CLOUDINARY_API_SECRET).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([buf], { type }));
  form.append("api_key", process.env.CLOUDINARY_API_KEY!);
  form.append("timestamp", String(ts));
  form.append("folder", `puneet/${folder}`);
  form.append("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${isVideo ? "video" : "image"}/upload`, { method: "POST", body: form });
  if (!res.ok) return { error: "Upload failed, please try again" };
  const j = (await res.json()) as { secure_url: string };
  // Deliver resized, auto-format images (phone photos are 3–8 MB originals).
  return { url: isVideo ? j.secure_url : j.secure_url.replace("/upload/", "/upload/f_auto,q_auto,c_limit,w_1200/") };
}
