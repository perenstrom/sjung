import { z } from "zod";

import { formDataString } from "@/lib/schemas/form-data";

/** The image types a Cover image may have; the browser and the server both check them. */
export const COVER_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const COVER_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const UNSUPPORTED_TYPE_MESSAGE = "Omslagsbilden måste vara en JPEG-, PNG- eller WebP-bild";
const TOO_LARGE_MESSAGE = "Omslagsbilden är för stor (max 5 MB)";

/**
 * Why an image can't be a Cover image, in Swedish, or `null` when it can.
 * Checked on the chosen file, on the upload request, and on the stored object.
 */
export function coverImageRefusal({ contentType, size }: { contentType: string; size: number }): string | null {
  if (!(COVER_IMAGE_CONTENT_TYPES as readonly string[]).includes(contentType)) {
    return UNSUPPORTED_TYPE_MESSAGE;
  }
  if (!Number.isInteger(size) || size <= 0) {
    return "Ogiltig filstorlek";
  }
  if (size > COVER_IMAGE_MAX_SIZE_BYTES) {
    return TOO_LARGE_MESSAGE;
  }
  return null;
}

const storagePathSchema = z.string().trim().min(1, { error: "Sökväg saknas" });

/** The image the browser asks to upload as the Cover image; refused unless it may be one. */
export function parseCoverImageUploadFromFormData(formData: FormData): { contentType: string; size: number } {
  const upload = {
    contentType: formDataString(formData, "contentType").trim(),
    size: Number(formDataString(formData, "size")),
  };
  const refusal = coverImageRefusal(upload);
  if (refusal) {
    throw new Error(refusal);
  }
  return upload;
}

/** Where the browser says it put the uploaded Cover image. */
export function parseCoverImageStoragePathFromFormData(formData: FormData): string {
  const result = storagePathSchema.safeParse(formDataString(formData, "storagePath"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Validering misslyckades");
  }
  return result.data;
}
