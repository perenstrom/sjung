import { z } from "zod";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function formDataString(formData: FormData, field: string): string {
  const raw = formData.get(field);
  return typeof raw === "string" ? raw : "";
}

const pieceIdSchema = z.string().trim().min(1, { error: "Stycke saknas" });

const fileIdSchema = z.string().trim().min(1, { error: "Fil saknas" });

const fileNameSchema = z.string().trim().min(1, { error: "Filnamn saknas" });

const storagePathSchema = z.string().trim().min(1, { error: "Sökväg saknas" });

const mimeTypeFieldSchema = z
  .string()
  .trim()
  .min(1, { error: "Filtyp saknas" })
  .superRefine((val, ctx) => {
    if (!ALLOWED_MIME_TYPES.has(val)) {
      ctx.addIssue({ code: "custom", message: "Filtypen stöds inte" });
    }
  });

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
  ])
);

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
  mimeType: mimeTypeFieldSchema,
  size: sizeFieldSchema,
  displayName: optionalDisplayNameSchema,
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
  return result.data;
}

export function parseFinalizePieceFileUploadFromFormData(formData: FormData): {
  pieceId: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  displayName: string | null;
} {
  const raw = {
    pieceId: formDataString(formData, "pieceId"),
    fileName: formDataString(formData, "fileName"),
    storagePath: formDataString(formData, "storagePath"),
    mimeType: formDataString(formData, "mimeType"),
    size: formDataString(formData, "size"),
    displayName: formData.get("displayName"),
  };
  const result = finalizePieceFileUploadFormSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Validering misslyckades");
  }
  return result.data;
}

export function parseFileIdFromFormData(formData: FormData): string {
  const result = fileIdSchema.safeParse(formDataString(formData, "fileId"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Validering misslyckades");
  }
  return result.data;
}
