export interface StorageAdapter {
  readonly provider: string;
  upload(input: { key: string; contentType: string; data: Buffer }): Promise<{ url: string }>;
  remove(key: string): Promise<void>;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "video/mp4", "video/quicktime"]);

export function mediaTypeForContentType(contentType: string): "image" | "video" {
  return contentType.startsWith("video/") ? "video" : "image";
}

export function assertUploadIsAllowed(contentType: string, size: number) {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) throw new Error(`Unsupported file type: ${contentType}`);
  if (size > MAX_UPLOAD_BYTES) throw new Error("Files must be 25MB or smaller.");
}

/**
 * Vercel Blob adapter. Behind the same "no SDK call without credentials" gate as
 * @benefitly/payments -- see docs/PRODUCTION_READINESS.md's "Required external inputs" for the
 * storage-provider decision this still needs (malware scanning, retention policy) before real
 * campaign media is accepted in production.
 */
class VercelBlobStorageAdapter implements StorageAdapter {
  readonly provider = "vercel_blob";
  constructor(private readonly token: string) {}

  async upload(input: { key: string; contentType: string; data: Buffer }): Promise<{ url: string }> {
    const { put } = await import("@vercel/blob");
    const blob = await put(input.key, input.data, { access: "public", contentType: input.contentType, token: this.token, addRandomSuffix: true });
    return { url: blob.url };
  }

  async remove(key: string): Promise<void> {
    const { del } = await import("@vercel/blob");
    await del(key, { token: this.token });
  }
}

let cachedAdapter: StorageAdapter | null | undefined;

export function getStorageAdapter(): StorageAdapter | null {
  if (cachedAdapter !== undefined) return cachedAdapter;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  cachedAdapter = token ? new VercelBlobStorageAdapter(token) : null;
  return cachedAdapter;
}
