"use client";

import { useState } from "react";

import {
  createPieceFileReplaceUploadUrl,
  createPieceFileUploadUrl,
  finalizePieceFileReplace,
  finalizePieceFileUpload,
} from "@/app/actions/files";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/schemas/files";

type PieceFileTransferTarget =
  | { kind: "upload"; groupSlug: string; pieceId: string }
  | { kind: "replace"; groupSlug: string; fileId: string };

type PieceFileUploadUrlResult = {
  uploadUrl: string;
  storagePath: string;
  headers: Record<string, string>;
};

type PieceFileTransferAdapter = {
  idField: "pieceId" | "fileId";
  idValue: string;
  createUploadUrl: (formData: FormData) => Promise<PieceFileUploadUrlResult>;
  finalize: (formData: FormData) => Promise<void>;
  missingFileMessage: string;
  failureFallbackMessage: string;
};

function resolveAdapter(target: PieceFileTransferTarget): PieceFileTransferAdapter {
  switch (target.kind) {
    case "upload":
      return {
        idField: "pieceId",
        idValue: target.pieceId,
        createUploadUrl: createPieceFileUploadUrl,
        finalize: finalizePieceFileUpload,
        missingFileMessage: "Välj en fil att ladda upp",
        failureFallbackMessage: "Kunde inte ladda upp fil",
      };
    case "replace":
      return {
        idField: "fileId",
        idValue: target.fileId,
        createUploadUrl: createPieceFileReplaceUploadUrl,
        finalize: finalizePieceFileReplace,
        missingFileMessage: "Välj en fil att ersätta med",
        failureFallbackMessage: "Kunde inte ersätta fil",
      };
  }
}

type UsePieceFileTransferArgs = {
  target: PieceFileTransferTarget;
  onError: (message: string) => void;
  onClearError?: () => void;
  onTransferringChange?: (transferring: boolean) => void;
  onTransferSuccess?: () => void;
};

export function usePieceFileTransfer({
  target,
  onError,
  onClearError,
  onTransferringChange,
  onTransferSuccess,
}: UsePieceFileTransferArgs) {
  const [isTransferring, setIsTransferring] = useState(false);

  function setTransferring(next: boolean) {
    setIsTransferring(next);
    onTransferringChange?.(next);
  }

  async function handleTransfer(formData: FormData) {
    const adapter = resolveAdapter(target);

    const selectedFile = formData.get("file");
    if (!(selectedFile instanceof File)) {
      onError(adapter.missingFileMessage);
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

    setTransferring(true);
    onClearError?.();

    try {
      const uploadMeta = new FormData();
      uploadMeta.set("groupSlug", target.groupSlug);
      uploadMeta.set(adapter.idField, adapter.idValue);
      uploadMeta.set("fileName", selectedFile.name);
      uploadMeta.set("mimeType", selectedFile.type);
      uploadMeta.set("size", String(selectedFile.size));

      const uploadData = await adapter.createUploadUrl(uploadMeta);
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: "PUT",
        headers: uploadData.headers,
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Kunde inte ladda upp filen");
      }

      const finalizeData = new FormData();
      finalizeData.set("groupSlug", target.groupSlug);
      finalizeData.set(adapter.idField, adapter.idValue);
      finalizeData.set("fileName", selectedFile.name);
      finalizeData.set("storagePath", uploadData.storagePath);
      finalizeData.set("mimeType", selectedFile.type);
      finalizeData.set("size", String(selectedFile.size));
      finalizeData.set("displayName", selectedFile.name);
      await adapter.finalize(finalizeData);

      onTransferSuccess?.();
    } catch (err) {
      onError(getThrownMessage(err, adapter.failureFallbackMessage));
    } finally {
      setTransferring(false);
    }
  }

  return { handleTransfer, isTransferring };
}
