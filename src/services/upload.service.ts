import { promises as fs } from "fs";
import path from "path";

/**
 * FileUploadService — provider interface.
 * "local" writes to /public/uploads (works out of the box in dev).
 * "cloudinary" is wired for drop-in replacement once env keys are set.
 */

export interface UploadResult {
  url: string;
  provider: "local" | "cloudinary";
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function uploadFile(file: File, folder = "products"): Promise<UploadResult> {
  if (!ALLOWED.includes(file.type)) throw new Error("Only image files (jpg/png/webp/gif/avif) are allowed.");
  if (file.size > MAX_BYTES) throw new Error("File too large (max 8MB).");

  if (process.env.STORAGE_PROVIDER === "cloudinary") {
    return uploadToCloudinary(file, folder);
  }
  return uploadLocal(file, folder);
}

async function uploadLocal(file: File, folder: string): Promise<UploadResult> {
  const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z]/g, "") || "jpg";
  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", safeFolder);
  await fs.mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);
  return { url: `/uploads/${safeFolder}/${filename}`, provider: "local" };
}

async function uploadToCloudinary(file: File, folder: string): Promise<UploadResult> {
  // Cloudinary provider: requires CLOUDINARY_* env vars. Uses signed upload via their REST API.
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary env vars not configured; falling back is not possible at runtime.");

  const timestamp = Math.floor(Date.now() / 1000);
  const cryptoMod = await import("crypto");
  const toSign = `folder=bias-collection/${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = cryptoMod.createHash("sha1").update(toSign).digest("hex");

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", `bias-collection/${folder}`);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Cloudinary upload failed.");
  const json = await res.json();
  return { url: json.secure_url as string, provider: "cloudinary" };
}
