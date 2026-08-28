import {
  extFromContentType,
  validateImage,
  keyFromUrl,
  MAX_IMAGE_BYTES,
} from "./recipeImage";

describe("extFromContentType", () => {
  it("maps allowed image types to extensions", () => {
    expect(extFromContentType("image/jpeg")).toBe("jpg");
    expect(extFromContentType("image/png")).toBe("png");
    expect(extFromContentType("image/webp")).toBe("webp");
  });

  it("is case-insensitive", () => {
    expect(extFromContentType("IMAGE/JPEG")).toBe("jpg");
  });

  it("returns null for unsupported types", () => {
    expect(extFromContentType("image/gif")).toBeNull();
    expect(extFromContentType("application/pdf")).toBeNull();
    expect(extFromContentType("")).toBeNull();
  });
});

describe("validateImage", () => {
  it("accepts a valid image within the size limit", () => {
    expect(validateImage({ contentType: "image/png", size: 1000 })).toEqual({
      ok: true,
      ext: "png",
    });
  });

  it("rejects unsupported types with 415", () => {
    const result = validateImage({ contentType: "image/gif", size: 1000 });
    expect(result).toMatchObject({ ok: false, status: 415 });
  });

  it("rejects oversize files with 413", () => {
    const result = validateImage({
      contentType: "image/jpeg",
      size: MAX_IMAGE_BYTES + 1,
    });
    expect(result).toMatchObject({ ok: false, status: 413 });
  });

  it("accepts a file exactly at the size limit", () => {
    expect(
      validateImage({ contentType: "image/jpeg", size: MAX_IMAGE_BYTES }),
    ).toEqual({ ok: true, ext: "jpg" });
  });
});

describe("keyFromUrl", () => {
  const BASE = "https://letemcook-media.nyc3.cdn.digitaloceanspaces.com";

  beforeEach(() => {
    process.env.DO_SPACES_CDN_BASE = BASE;
  });

  it("extracts the object key from a URL under our CDN base", () => {
    expect(keyFromUrl(`${BASE}/recipes/42/abc.jpg`)).toBe("recipes/42/abc.jpg");
  });

  it("tolerates a trailing slash on the configured base", () => {
    process.env.DO_SPACES_CDN_BASE = BASE + "/";
    expect(keyFromUrl(`${BASE}/recipes/42/abc.jpg`)).toBe("recipes/42/abc.jpg");
  });

  it("returns null for URLs not under our CDN base", () => {
    expect(keyFromUrl("https://example.com/recipes/42/abc.jpg")).toBeNull();
  });

  it("returns null for the base URL with no key", () => {
    expect(keyFromUrl(BASE)).toBeNull();
    expect(keyFromUrl(`${BASE}/`)).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(keyFromUrl("")).toBeNull();
  });
});
