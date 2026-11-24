import { z } from "zod";
import { isAllowedFile } from "@/lib/file-formats";
import { formDataString } from "@/lib/schemas/form-data";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const UNSUPPORTED_FILE_TYPE_MESSAGE = "Filtypen stöds inte";

const pieceIdSchema = z.string().trim().min(1, { error: "Stycke saknas" });

const fileIdSchema = z.string().trim().min(1, { error: "Fil saknas" });

const fileNameSchema = z.string().trim().min(1, { error: "Filnamn saknas" });

const storagePathSchema = z.string().trim().min(1, { error: "Sökväg saknas" });

const mimeTypeFieldSchema = z.string().trim().min(1, { error: "Filtyp saknas" });

const sizeFieldSchema = z
  .string()
  .trim()
  .min(1, { error: "Filstorlek saknas" })
  .superRefine((val, ctx) => {
    const num = Number(val);
    if (!Number.isInteger(num) || num <= 0) {
      ctx.addIssue({ code: "custom", message: "Ogiltig filstorlek" });
      return;
    }
    if (num > MAX_FILE_SIZE_BYTES) {
      ctx.addIssue({ code: "custom", message: "Filen är för stor (max 50 MB)" });
    }
  })
  .transform((val) => Number(val));

const optionalDisplayNameSchema = z.preprocess(
  (v: unknown) => (typeof v === "string" ? v : null),
  z.union([
    z.null(),
    z.string().transform((s) => {
      const t = s.trim();
      return t === "" ? null : t;
    }),
  ]),
);

const requiredDisplayNameSchema = z.preprocess(
  (v: unknown) => (typeof v === "string" ? v : ""),
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, { error: "Visningsnamn saknas" })),
);

const updatePieceFileDisplayNameFormSchema = z.object({
  fileId: fileIdSchema,
  displayName: requiredDisplayNameSchema,
});

const createPieceFileUploadFormSchema = z.object({
  pieceId: pieceIdSchema,
  fileName: fileNameSchema,
  mimeType: mimeTypeFieldSchema,
  size: sizeFieldSchema,
});

const finalizePieceFileUploadFormSchema = z.object({
  pieceId: pieceIdSchema,
  fileName: fileNameSchema,
  storagePath: storagePathSchema,
  displayName: optionalDisplayNameSchema,
});

const createPieceFileReplaceUploadFormSchema = z.object({
  fileId: fileIdSchema,
  fileName: fileNameSchema,
  mimeType: mimeTypeFieldSchema,
  size: sizeFieldSchema,
});

const finalizePieceFileReplaceFormSchema = z.object({
  fileId: fileIdSchema,
  fileName: fileNameSchema,
  storagePath: storagePathSchema,
});

export function parseCreatePieceFileUploadFromFormData(formData: FormData): {
  pieceId: string;
  fileName: string;
  mimeType: string;
  size: number;
} {
  const raw = {
    pieceId: formDataString(formData, "pieceId"),
    fileName: formDataString(formData, "fileName"),
    mimeType: formDataString(formData, "mimeType"),
    size: formDataString(formData, "size"),
  };
  const result = createPieceFileUploadFormSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Validering misslyckades");
  }
  assertAllowedFormat(result.data);
  return result.data;
}

export function parseFinalizePieceFileUploadFromFormData(formData: FormData): {
  pieceId: string;
  fileName: string;
  storagePath: string;
  displayName: string | null;
} {
  const raw = {
    pieceId: formDataString(formData, "pieceId"),
    fileName: formDataString(formData, "fileName"),
    storagePath: formDataString(formData, "storagePath"),
    displayName: formData.get("displayName"),
  };
  const result = finalizePieceFileUploadFormSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Validering misslyckades");
  }
  return result.data;
}

export function parseCreatePieceFileReplaceUploadFromFormData(formData: FormData): {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
} {
  const raw = {
    fileId: formDataString(formData, "fileId"),
    fileName: formDataString(formData, "fileName"),
    mimeType: formDataString(formData, "mimeType"),
    size: formDataString(formData, "size"),
  };
  const result = createPieceFileReplaceUploadFormSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Validering misslyckades");
  }
  assertAllowedFormat(result.data);
  return result.data;
}

export function parseFinalizePieceFileReplaceFromFormData(formData: FormData): {
  fileId: string;
  fileName: string;
  storagePath: string;
} {
  const raw = {
    fileId: formDataString(formData, "fileId"),
    fileName: formDataString(formData, "fileName"),
    storagePath: formDataString(formData, "storagePath"),
  };
  const result = finalizePieceFileReplaceFormSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Validering misslyckades");
  }
  return result.data;
}

/** Refuses a file whose extension and MIME type aren't an allowed format together. */
function assertAllowedFormat(file: { fileName: string; mimeType: string }) {
  if (!isAllowedFile(file)) {
    throw new Error(UNSUPPORTED_FILE_TYPE_MESSAGE);
  }
}

/**
 * Checks a finished upload's name, and its type and size in storage, against
 * the same rules as the upload request, throwing the same Swedish message.
 */
export function assertAllowedStoredFile({
  fileName,
  contentType,
  size,
}: {
  fileName: string;
  contentType: string;
  size: number;
}) {
  for (const result of [mimeTypeFieldSchema.safeParse(contentType), sizeFieldSchema.safeParse(String(size))]) {
    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? "Validering misslyckades");
    }
  }
  assertAllowedFormat({ fileName, mimeType: contentType });
}

export function parseFileIdFromFormData(formData: FormData): string {
  const result = fileIdSchema.safeParse(formDataString(formData, "fileId"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Validering misslyckades");
  }
  return result.data;
}

export function parseUpdatePieceFileDisplayNameFromFormData(formData: FormData): {
  fileId: string;
  displayName: string;
} {
  const raw = {
    fileId: formDataString(formData, "fileId"),
    displayName: formData.get("displayName"),
  };
  const result = updatePieceFileDisplayNameFormSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Validering misslyckades");
  }
  return result.data;
}
