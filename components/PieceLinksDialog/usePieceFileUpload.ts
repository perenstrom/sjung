"use client";

import { useState } from "react";

import {
  createPieceFileUploadUrl,
  finalizePieceFileUpload,
} from "@/app/actions/files";
import { getThrownMessage } from "@/lib/getThrownMessage";

import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "./pieceFileConstraints";

type UsePieceFileUploadArgs = {
  groupSlug: string;
  pieceId: string;
  onError: (message: string) => void;
  onClearError?: () => void;
  onUploadingChange?: (uploading: boolean) => void;
};

export function usePieceFileUpload({
  groupSlug,
  pieceId,
  onError,
  onClearError,
  onUploadingChange,
}: UsePieceFileUploadArgs) {
  const [isUploading, setIsUploading] = useState(false);

  function setUploading(next: boolean) {
    setIsUploading(next);
    onUploadingChange?.(next);
  }

  async function handleUpload(formData: FormData) {
    const selectedFile = formData.get("file");
    if (!(selectedFile instanceof File)) {
      onError("Välj en fil att ladda upp");
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(selectedFile.type)) {
      onError("Filtypen stöds inte");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      onError("Filen är för stor (max 50 MB)");
      return;
    }

    setUploading(true);
    onClearError?.();

    try {
      const uploadMeta = new FormData();
      uploadMeta.set("groupSlug", groupSlug);
      uploadMeta.set("pieceId", pieceId);
      uploadMeta.set("fileName", selectedFile.name);
      uploadMeta.set("mimeType", selectedFile.type);
      uploadMeta.set("size", String(selectedFile.size));

      const uploadData = await createPieceFileUploadUrl(uploadMeta);
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: "PUT",
        headers: uploadData.headers,
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Kunde inte ladda upp filen");
      }

      const finalizeData = new FormData();
      finalizeData.set("groupSlug", groupSlug);
      finalizeData.set("pieceId", pieceId);
      finalizeData.set("fileName", selectedFile.name);
      finalizeData.set("storagePath", uploadData.storagePath);
      finalizeData.set("mimeType", selectedFile.type);
      finalizeData.set("size", String(selectedFile.size));
      finalizeData.set("displayName", selectedFile.name);
      await finalizePieceFileUpload(finalizeData);
    } catch (err) {
      onError(getThrownMessage(err, "Kunde inte ladda upp fil"));
    } finally {
      setUploading(false);
    }
  }

  return { handleUpload, isUploading };
}
