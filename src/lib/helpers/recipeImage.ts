/**
 * Pure helpers for recipe photo uploads — no AWS SDK / network deps, so they're
 * cheap to unit-test (see recipeImage.test.ts). The Spaces client and upload/
 * delete operations live in src/lib/storage.ts, which re-exports these.
 */

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// 4 MB, kept safely under Vercel's 4.5 MB serverless request-body limit so
// oversize uploads are rejected with our own message rather than a platform 413.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Maps an allowed image content-type to a file extension, or null if unsupported. */
export function extFromContentType(contentType: string): string | null {
  return ALLOWED_TYPES[contentType?.toLowerCase()] ?? null;
}

export type ImageValidation =
  | { ok: true; ext: string }
  | { ok: false; status: 413 | 415; error: string };

/** Validates an upload's content-type and size. */
export function validateImage(input: {
  contentType: string;
  size: number;
}): ImageValidation {
  const ext = extFromContentType(input.contentType);
  if (!ext) {
    return {
      ok: false,
      status: 415,
      error: "Unsupported image type. Use JPEG, PNG, or WebP.",
    };
  }
  if (input.size > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, error: "Image must be 4 MB or smaller." };
  }
  return { ok: true, ext };
}

/** The configured Spaces CDN base URL, with any trailing slashes trimmed. */
export function getCdnBase(): string {
  const base = process.env.DO_SPACES_CDN_BASE;
  if (!base) {
    throw new Error("DO_SPACES_CDN_BASE is not configured");
  }
  return base.replace(/\/+$/, "");
}

/**
 * Extracts the object key from a CDN URL, or null if the URL is not under our
 * configured CDN base. Returning null protects deleteObjectByUrl from ever
 * deleting a shared/copied object that doesn't belong to our bucket.
 */
export function keyFromUrl(url: string): string | null {
  if (!url) return null;
  const base = getCdnBase();
  if (!url.startsWith(base + "/")) return null;
  const key = url.slice(base.length + 1);
  return key.length > 0 ? key : null;
}
