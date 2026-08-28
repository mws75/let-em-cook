"use client";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

type RecipePhotoProps = {
  recipeId: number;
  imageUrl: string | null;
  /** Recipe name — used as the image alt text. */
  name: string;
  /** Only owners get the Add / Change / Remove controls. */
  isOwner: boolean;
  /** Called after a successful upload (url) or removal (null) so the parent can update state. */
  onChange: (imageUrl: string | null) => void;
};

/**
 * Renders a recipe photo that fills its parent container, with owner-only
 * Add / Change / Remove controls. Used in the side-by-side header of the recipe
 * detail page and the recipe modal.
 *
 * The parent is responsible for sizing (this fills width & height) and for
 * deciding whether to render it at all: when there's no photo AND the viewer
 * isn't the owner, the parent should omit the photo column entirely so the
 * header collapses to full-width text.
 */
export default function RecipePhoto({
  recipeId,
  imageUrl,
  name,
  isOwner,
  onChange,
}: RecipePhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setBusy(true);
    const toastId = toast.loading("Uploading photo…");
    try {
      const response = await fetch(`/api/recipes/${recipeId}/image`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload photo");
      }
      onChange(data.image_url);
      toast.success("Photo updated", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload photo",
        { id: toastId },
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove this photo?")) return;

    setBusy(true);
    const toastId = toast.loading("Removing photo…");
    try {
      const response = await fetch(`/api/recipes/${recipeId}/image`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to remove photo");
      }
      onChange(null);
      toast.success("Photo removed", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove photo",
        { id: toastId },
      );
    } finally {
      setBusy(false);
    }
  };

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      onChange={handleFile}
    />
  );

  // Owner, no photo yet → dropzone
  if (!imageUrl) {
    return (
      <button
        type="button"
        onClick={pickFile}
        disabled={busy}
        className="group flex h-full w-full min-h-[210px] flex-col items-center justify-center gap-2 border-2 border-dashed border-border text-text-secondary hover:border-primary hover:bg-primary/5 hover:text-text transition-colors disabled:opacity-60"
        aria-label="Add a photo"
      >
        <CameraIcon className="w-7 h-7 opacity-70" />
        <span className="text-sm font-semibold">
          {busy ? "Uploading…" : "Add a photo"}
        </span>
        <span className="text-xs">JPG, PNG or WebP · up to 4 MB</span>
        {hiddenInput}
      </button>
    );
  }

  // Has photo
  return (
    <div className="relative h-full w-full min-h-[210px] print:min-h-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={name}
        className="h-full w-full object-cover"
      />
      {isOwner && (
        <div className="absolute bottom-3 right-3 flex gap-2 print:hidden">
          <button
            type="button"
            onClick={pickFile}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-text shadow-sm backdrop-blur border border-border/70 hover:brightness-95 disabled:opacity-60"
          >
            <CameraIcon className="w-3.5 h-3.5" />
            Change
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-text shadow-sm backdrop-blur border border-border/70 hover:brightness-95 disabled:opacity-60"
            aria-label="Remove photo"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {hiddenInput}
    </div>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
