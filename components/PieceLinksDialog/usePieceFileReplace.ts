"use client";

import { useState } from "react";

import {
  createPieceFileReplaceUploadUrl,
  finalizePieceFileReplace,
} from "@/app/actions/files";
import { getThrownMessage } from "@/lib/getThrownMessage";

import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "./pieceFileConstraints";

type UsePieceFileReplaceArgs = {
  groupSlug: string;
  fileId: string;
  onError: (message: string) => void;
  onClearError?: () => void;
  onReplacingChange?: (replacing: boolean) => void;
  onReplaceSuccess?: () => void;
};

export function usePieceFileReplace({
  groupSlug,
  fileId,
  onError,
  onClearError,
  onReplacingChange,
  onReplaceSuccess,
}: UsePieceFileReplaceArgs) {
  const [isReplacing, setIsReplacing] = useState(false);

  function setReplacing(next: boolean) {
    setIsReplacing(next);
    onReplacingChange?.(next);
  }

  async function handleReplace(formData: FormData) {
    const selectedFile = formData.get("file");
    if (!(selectedFile instanceof File)) {
      onError("Välj en fil att ersätta med");
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

    setReplacing(true);
    onClearError?.();

    try {
      const uploadMeta = new FormData();
      uploadMeta.set("groupSlug", groupSlug);
      uploadMeta.set("fileId", fileId);
      uploadMeta.set("fileName", selectedFile.name);
      uploadMeta.set("mimeType", selectedFile.type);
      uploadMeta.set("size", String(selectedFile.size));

      const uploadData = await createPieceFileReplaceUploadUrl(uploadMeta);
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
      finalizeData.set("fileId", fileId);
      finalizeData.set("fileName", selectedFile.name);
      finalizeData.set("storagePath", uploadData.storagePath);
      finalizeData.set("mimeType", selectedFile.type);
      finalizeData.set("size", String(selectedFile.size));
      await finalizePieceFileReplace(finalizeData);
      onReplaceSuccess?.();
    } catch (err) {
      onError(getThrownMessage(err, "Kunde inte ersätta fil"));
    } finally {
      setReplacing(false);
    }
  }

  return { handleReplace, isReplacing };
}
