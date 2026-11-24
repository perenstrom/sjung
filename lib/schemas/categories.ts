import { z } from "zod";

import { MAX_CATEGORY_LENGTH } from "@/lib/pieces/categories";
import { formDataString } from "@/lib/schemas/form-data";

const categorySchema = z
  .string()
  .trim()
  .max(MAX_CATEGORY_LENGTH, {
    error: `Kategorin får vara högst ${MAX_CATEGORY_LENGTH} tecken`,
  });

/**
 * The typed Category of a File or Link, trimmed; empty when none was given.
 * Resolve it with `resolveCategory` before storing it.
 */
export function parseCategoryFromFormData(formData: FormData): string {
  const result = categorySchema.safeParse(formDataString(formData, "category"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Ogiltig kategori");
  }
  return result.data;
}
