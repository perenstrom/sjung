"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { addLink } from "@/app/actions/pieces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getThrownMessage } from "@/lib/getThrownMessage";

/** Always-visible row for adding one Link to a Piece. */
export function AddPieceLinkRow({
  groupSlug,
  pieceId,
}: {
  groupSlug: string;
  pieceId: string;
}) {
  const router = useRouter();
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Not a form action: those reset the inputs even when adding fails.
    event.preventDefault();
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("pieceId", pieceId);
      formData.set("url", url);
      formData.set("label", label);
      await addLink(formData);
      setError(null);
      setUrl("");
      setLabel("");
      urlInputRef.current?.focus();
      router.refresh();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte lägga till länk"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={urlInputRef}
          type="url"
          required
          placeholder="https://…"
          aria-label="Länk"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="min-w-48 flex-[2]"
        />
        <Input
          placeholder="Etikett (valfritt)"
          aria-label="Etikett (valfritt)"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="min-w-36 flex-1"
        />
        <Button type="submit" variant="outline" disabled={pending}>
          <Plus className="size-4" aria-hidden="true" />
          {pending ? "Lägger till…" : "Lägg till"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
