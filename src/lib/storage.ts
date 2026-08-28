import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import {
  extFromContentType,
  keyFromUrl,
  getCdnBase,
} from "./helpers/recipeImage";
import { recipeDocumentKey } from "./rag/recipeDocument";

/**
 * DigitalOcean Spaces storage (S3-compatible).
 *
 * Recipe photos are stored public-read under `recipes/{recipeId}/{uuid}.{ext}`
 * and served straight from the Spaces CDN (no signed URLs needed for display).
 * Lazy singleton client, mirroring the getStripe() pattern in src/lib/stripe.ts.
 *
 * Pure helpers (validateImage, extFromContentType, keyFromUrl) live in
 * src/lib/helpers/recipeImage.ts and are re-exported here for convenience.
 *
 * Env vars: DO_SPACES_ENDPOINT, DO_SPACES_REGION, DO_SPACES_BUCKET,
 *           DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_CDN_BASE
 */

export {
  validateImage,
  extFromContentType,
  keyFromUrl,
  MAX_IMAGE_BYTES,
} from "./helpers/recipeImage";
export type { ImageValidation } from "./helpers/recipeImage";

let client: S3Client | null = null;

function getSpaces(): S3Client {
  if (!client) {
    const {
      DO_SPACES_ENDPOINT,
      DO_SPACES_REGION,
      DO_SPACES_KEY,
      DO_SPACES_SECRET,
    } = process.env;
    if (
      !DO_SPACES_ENDPOINT ||
      !DO_SPACES_REGION ||
      !DO_SPACES_KEY ||
      !DO_SPACES_SECRET
    ) {
      throw new Error("DigitalOcean Spaces env vars are not configured");
    }
    client = new S3Client({
      endpoint: DO_SPACES_ENDPOINT,
      region: DO_SPACES_REGION,
      credentials: {
        accessKeyId: DO_SPACES_KEY,
        secretAccessKey: DO_SPACES_SECRET,
      },
      forcePathStyle: false,
    });
  }
  return client;
}

function getBucket(): string {
  const bucket = process.env.DO_SPACES_BUCKET;
  if (!bucket) {
    throw new Error("DO_SPACES_BUCKET is not configured");
  }
  return bucket;
}

/**
 * Uploads a recipe photo to Spaces (public-read, immutable cache) and returns
 * its public CDN URL. Caller is responsible for validating the buffer first.
 */
export async function uploadRecipeImage(
  recipeId: number,
  buffer: Buffer,
  contentType: string,
): Promise<{ url: string; key: string }> {
  const ext = extFromContentType(contentType);
  if (!ext) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }
  const key = `recipes/${recipeId}/${randomUUID()}.${ext}`;
  await getSpaces().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return { url: `${getCdnBase()}/${key}`, key };
}

/**
 * Best-effort delete of a Spaces object given its CDN URL. No-ops (and never
 * throws) when the URL isn't under our CDN base — this is intentional so a
 * copied recipe sharing another row's image URL can't delete the shared object.
 */
export async function deleteObjectByUrl(url: string | null): Promise<void> {
  if (!url) return;
  const key = keyFromUrl(url);
  if (!key) return;
  try {
    await getSpaces().send(
      new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
    );
  } catch (error) {
    // Cleanup is best-effort; an orphaned object must never fail the request.
    console.error("Failed to delete Spaces object:", key, error);
  }
}

/**
 * Uploads a recipe's RAG document (Markdown) for the DigitalOcean GenAI
 * knowledge base. Stored PRIVATE (no public-read ACL) under
 * `rag/recipes/{userId}/{recipeId}.md` — only the KB reads these, never the
 * browser. See docs/RAG_Recipe_Assistant_Implementation_Guide.md §5.2.
 */
export async function putRecipeDocument(
  userId: number,
  recipeId: number,
  body: string,
): Promise<void> {
  await getSpaces().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: recipeDocumentKey(userId, recipeId),
      Body: body,
      ContentType: "text/markdown; charset=utf-8",
    }),
  );
}

/**
 * Best-effort delete of a recipe's RAG document. Never throws — mirrors
 * deleteObjectByUrl so a missing doc can't fail the request.
 */
export async function deleteRecipeDocument(
  userId: number,
  recipeId: number,
): Promise<void> {
  try {
    await getSpaces().send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: recipeDocumentKey(userId, recipeId),
      }),
    );
  } catch (error) {
    console.error(
      "Failed to delete RAG document:",
      recipeDocumentKey(userId, recipeId),
      error,
    );
  }
}
