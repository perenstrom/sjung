"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, RefreshCw } from "lucide-react";

import { createGroupCoverImageUploadUrl, setGroupCoverImage } from "@/app/actions/groups";
import { CoverImageFrame } from "@/components/home/CoverImageFrame";
import { FileRightsReminder } from "@/components/legal/FileRightsReminder";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { COVER_IMAGE_CONTENT_TYPES, coverImageRefusal } from "@/lib/schemas/cover-image";

/**
 * _Lägg till omslagsbild_ or, with `replacing`, _Byt omslagsbild_: previews
 * the chosen image in Home's 3:1 frame, then uploads it straight to storage
 * and makes it the Cover image. The server checks the stored image again.
 */
export function CoverImageUploadDialog({ groupSlug, replacing = false }: { groupSlug: string; replacing?: boolean }) {
  const label = replacing ? "Byt omslagsbild" : "Lägg till omslagsbild";
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useChosenImage();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    // Keep the dialog open mid-upload so its outcome stays visible.
    if (!nextOpen && isSaving) {
      return;
    }
    if (!nextOpen) {
      setChosen(null);
      setError(null);
    }
    setOpen(nextOpen);
  }

  function handleChoose(file: File | null) {
    const refusal = file ? coverImageRefusal({ contentType: file.type, size: file.size }) : null;
    setError(refusal);
    setChosen(refusal ? null : file);
  }

  function handleSave() {
    if (!chosen) {
      setError("Välj en bild");
      return;
    }
    startSaving(async () => {
      try {
        await uploadCoverImage(groupSlug, chosen.file);
        setChosen(null);
        setError(null);
        setOpen(false);
      } catch (err) {
        setError(getThrownMessage(err, "Kunde inte spara omslagsbilden"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {replacing ? <RefreshCw aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cover-image-file">Välj bild</Label>
            <Input
              id="cover-image-file"
              type="file"
              accept={COVER_IMAGE_CONTENT_TYPES.join(",")}
              disabled={isSaving}
              onChange={(event) => handleChoose(event.currentTarget.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">JPEG, PNG eller WebP, högst 5 MB.</p>
            <FileRightsReminder />
          </div>
          {chosen ? <CoverImageFrame src={chosen.previewUrl} /> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Avbryt
          </Button>
          <Button type="button" onClick={handleSave} disabled={!chosen || isSaving}>
            {isSaving ? (
              <>
                <Spinner />
                Sparar...
              </>
            ) : (
              "Spara"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Asks for a signed upload link, puts the image there, then makes it the Group's Cover image. */
async function uploadCoverImage(groupSlug: string, file: File) {
  const request = new FormData();
  request.set("groupSlug", groupSlug);
  request.set("contentType", file.type);
  request.set("size", String(file.size));
  const { uploadUrl, storagePath, headers } = await createGroupCoverImageUploadUrl(request);

  const uploaded = await fetch(uploadUrl, { method: "PUT", headers, body: file });
  if (!uploaded.ok) {
    throw new Error("Kunde inte ladda upp bilden");
  }

  const finish = new FormData();
  finish.set("groupSlug", groupSlug);
  finish.set("storagePath", storagePath);
  await setGroupCoverImage(finish);
}

type ChosenImage = { file: File; previewUrl: string };

/**
 * The chosen image with a temporary URL previewing it. Choosing another,
 * clearing it, or the dialog going away revokes the old URL.
 */
function useChosenImage(): [ChosenImage | null, (file: File | null) => void] {
  const [chosen, setChosenState] = useState<ChosenImage | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  function setChosen(file: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const next = file ? { file, previewUrl: URL.createObjectURL(file) } : null;
    previewUrlRef.current = next?.previewUrl ?? null;
    setChosenState(next);
  }

  return [chosen, setChosen];
}
