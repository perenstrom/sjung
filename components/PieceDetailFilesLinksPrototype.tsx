"use client";

// PROTOTYPE (PER-349): four layouts for the Filer and Länkar cards on the
// piece detail page, switchable via ?variant=A|B|C|D. The add-file style and
// where remove errors show are toggles in the switcher bar, so they can be
// judged against every layout. All mutations hit an in-memory stub, not the
// database or S3, so a reload resets everything. Never merge to main.

import {
  Download,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";

import { useEditMode } from "@/components/EditModeContext";
import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";
import { labelForLink } from "@/components/pieces/linkLabel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFileSize } from "@/lib/formatFileSize";
import { PIECE_FILE_ACCEPT_ATTR } from "@/lib/schemas/files";
import { cn } from "@/lib/utils";

type StubFile = { id: string; displayName: string; size: number; createdAt: Date | string };
type StubLink = { id: string; url: string; label: string | null };

type FileAddMode = "pick" | "button" | "drop";
type ErrorPlacement = "row" | "list";

const VARIANTS = [
  { key: "A", name: "Rymliga rader, ikoner till höger" },
  { key: "B", name: "Täta rader, ikoner direkt efter" },
  { key: "C", name: "Compact som i Noter" },
  { key: "D", name: "Tabell" },
];

const STUB_DELAY_MS = 600;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => Math.random().toString(36).slice(2);

function formatUploadedAt(value: Date | string, withTime = true): string {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: withTime ? "short" : undefined,
  }).format(new Date(value));
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Stub store

type Store = {
  files: StubFile[];
  links: StubLink[];
  uploadFile: (file: File) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  renameFile: (id: string, displayName: string) => Promise<void>;
  replaceFile: (id: string, file: File) => Promise<void>;
  downloadFile: (id: string) => Promise<void>;
  addLink: (url: string, label: string) => Promise<void>;
  removeLink: (id: string) => Promise<void>;
  editLink: (id: string, url: string, label: string) => Promise<void>;
};

type Options = { fileAddMode: FileAddMode; errorPlacement: ErrorPlacement };

type VariantProps = { store: Store; options: Options; readOnly: boolean };

export function PieceDetailFilesLinksPrototype({
  files: initialFiles,
  links: initialLinks,
}: {
  files: StubFile[];
  links: StubLink[];
}) {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "B";
  const { isEditing } = useEditMode();

  const [files, setFiles] = useState(initialFiles);
  const [links, setLinks] = useState(initialLinks);
  const [fileAddMode, setFileAddMode] = useState<FileAddMode>("drop");
  const [errorPlacement, setErrorPlacement] = useState<ErrorPlacement>("list");
  const [failRemoves, setFailRemoves] = useState(false);
  const [failAdds, setFailAdds] = useState(false);

  async function failable(fail: boolean, message: string) {
    await delay(STUB_DELAY_MS);
    if (fail) throw new Error(message);
  }

  const store: Store = {
    files,
    links,
    async uploadFile(file) {
      await failable(failAdds, "Uppladdningen misslyckades");
      setFiles((prev) => [
        ...prev,
        { id: newId(), displayName: file.name, size: file.size, createdAt: new Date() },
      ]);
    },
    async removeFile(id) {
      await failable(failRemoves, "Kunde inte ta bort fil");
      setFiles((prev) => prev.filter((f) => f.id !== id));
    },
    async renameFile(id, displayName) {
      await failable(false, "");
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, displayName } : f)));
    },
    async replaceFile(id, file) {
      await failable(failAdds, "Kunde inte ersätta fil");
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, size: file.size, createdAt: new Date() } : f))
      );
    },
    async downloadFile() {
      await delay(STUB_DELAY_MS);
    },
    async addLink(url, label) {
      await failable(failAdds, "Kunde inte lägga till länk");
      setLinks((prev) => [...prev, { id: newId(), url, label: label || null }]);
    },
    async removeLink(id) {
      await failable(failRemoves, "Kunde inte ta bort länk");
      setLinks((prev) => prev.filter((l) => l.id !== id));
    },
    async editLink(id, url, label) {
      await failable(false, "");
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, url, label: label || null } : l)));
    },
  };

  const props: VariantProps = {
    store,
    options: { fileAddMode, errorPlacement },
    readOnly: !isEditing,
  };
  // Remount on every edit-mode toggle, like the real sections.
  const key = `${variant}:${isEditing ? "edit" : "read"}`;

  return (
    <>
      {variant === "A" ? (
        <VariantA key={key} {...props} />
      ) : variant === "C" ? (
        <VariantC key={key} {...props} />
      ) : variant === "D" ? (
        <VariantD key={key} {...props} />
      ) : (
        <VariantB key={key} {...props} />
      )}

      <PrototypeSwitcher variants={VARIANTS} current={variant}>
        <div className="flex max-w-[90vw] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-white/80">
          <span>
            Stub: {files.length} filer, {links.length} länkar
            {isEditing ? " · redigeringsläge" : " · läsläge"}
          </span>
          <button
            type="button"
            className="underline"
            onClick={() => {
              setFiles(initialFiles);
              setLinks(initialLinks);
            }}
          >
            Återställ
          </button>
          <button
            type="button"
            className="underline"
            onClick={() => {
              setFiles([]);
              setLinks([]);
            }}
          >
            Töm
          </button>
          <button
            type="button"
            className="underline"
            onClick={() => {
              setFiles(EXAMPLE_FILES);
              setLinks(EXAMPLE_LINKS);
            }}
          >
            Exempel
          </button>
        </div>
        <div className="flex max-w-[90vw] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-white/80">
          <label className="inline-flex items-center gap-1">
            Lägg till fil:
            <select
              className="rounded bg-white/10 px-1"
              value={fileAddMode}
              onChange={(e) => setFileAddMode(e.target.value as FileAddMode)}
            >
              <option value="pick">Knapp, laddar upp direkt</option>
              <option value="button">Filfält + Ladda upp</option>
              <option value="drop">Släppzon</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-1">
            Fel vid borttagning:
            <select
              className="rounded bg-white/10 px-1"
              value={errorPlacement}
              onChange={(e) => setErrorPlacement(e.target.value as ErrorPlacement)}
            >
              <option value="list">En gång under listan</option>
              <option value="row">Under raden</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={failRemoves}
              onChange={(e) => setFailRemoves(e.target.checked)}
            />
            Borttagning misslyckas
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={failAdds}
              onChange={(e) => setFailAdds(e.target.checked)}
            />
            Tillägg misslyckas
          </label>
        </div>
      </PrototypeSwitcher>
    </>
  );
}

const EXAMPLE_FILES: StubFile[] = [
  {
    id: "ex-f1",
    displayName: "Ave verum corpus – sopran 1 och 2, reviderad version hösten 2024.pdf",
    size: 2_456_000,
    createdAt: "2026-09-14T18:12:00Z",
  },
  { id: "ex-f2", displayName: "Partitur.pdf", size: 812_000, createdAt: "2026-10-02T09:30:00Z" },
  { id: "ex-f3", displayName: "Uttalsguide.png", size: 98_000, createdAt: "2026-10-28T20:45:00Z" },
];

const EXAMPLE_LINKS: StubLink[] = [
  { id: "ex-l1", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", label: "Inspelning, King's College" },
  { id: "ex-l2", url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", label: null },
  {
    id: "ex-l3",
    url: "https://www.cpdl.org/wiki/index.php/Ave_verum_corpus,_K._618_(Wolfgang_Amadeus_Mozart)",
    label: "CPDL",
  },
];

// ---------------------------------------------------------------------------
// Shared behaviour: busy/error state per list. Layout lives in each variant.

function useListMutation(errorPlacement: ErrorPlacement) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [listError, setListError] = useState<string | null>(null);

  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id);
    try {
      await action();
      setRowErrors(({ [id]: _cleared, ...rest }) => rest);
      setListError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Något gick fel";
      if (errorPlacement === "row") {
        setRowErrors((prev) => ({ ...prev, [id]: message }));
      } else {
        setListError(message);
      }
    } finally {
      setBusyId(null);
    }
  }

  return {
    busyId,
    run,
    rowError: (id: string) => (errorPlacement === "row" ? rowErrors[id] : undefined),
    listError: errorPlacement === "list" ? listError : null,
  };
}

/** Card shell settled by PER-202: heading only, list, errors, add row under a border. */
function SectionCard({
  title,
  empty,
  emptyCopy,
  list,
  listError,
  addRow,
  readOnly,
}: {
  title: string;
  empty: boolean;
  emptyCopy: string;
  list: ReactNode;
  listError: string | null;
  addRow: ReactNode;
  readOnly: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
        <h2 className="text-lg leading-8 font-medium">{title}</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {empty ? <p className="text-sm text-muted-foreground">{emptyCopy}</p> : list}
        {listError ? <p className="text-sm text-destructive">{listError}</p> : null}
        {readOnly ? null : <div className="border-t pt-3">{addRow}</div>}
      </CardContent>
    </Card>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

function RowError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

// ---------------------------------------------------------------------------
// Stub popovers, standing in for Rename/Replace/EditLink popovers.

function RenameFilePopover({ file, store }: { file: StubFile; store: Store }) {
  const [open, setOpen] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) return;
    await store.renameFile(file.id, name);
    setOpen(false);
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label={`Redigera filnamn ${file.displayName}`}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input name="name" defaultValue={file.displayName} aria-label="Filnamn" autoFocus />
          <Button type="submit">Spara</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function ReplaceFilePopover({ file, store }: { file: StubFile; store: Store }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  async function handlePick(picked: File | undefined) {
    if (!picked) return;
    setPending(true);
    try {
      await store.replaceFile(file.id, picked);
      setOpen(false);
    } finally {
      setPending(false);
    }
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label={`Ersätt fil ${file.displayName}`}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2">
        <p className="text-sm font-medium">Ersätt fil</p>
        <Input
          type="file"
          accept={PIECE_FILE_ACCEPT_ATTR}
          disabled={pending}
          onChange={(e) => handlePick(e.target.files?.[0])}
        />
        {pending ? <p className="text-sm text-muted-foreground">Laddar upp…</p> : null}
      </PopoverContent>
    </Popover>
  );
}

function EditLinkPopover({ link, store }: { link: StubLink; store: Store }) {
  const [open, setOpen] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await store.editLink(link.id, String(data.get("url")), String(data.get("label") ?? ""));
    setOpen(false);
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label={`Redigera länk ${labelForLink(link)}`}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input name="url" type="url" defaultValue={link.url} aria-label="Länk" required />
          <Input name="label" defaultValue={link.label ?? ""} aria-label="Etikett (valfritt)" />
          <div className="flex justify-end">
            <Button type="submit">Spara</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Add rows (the part PER-202 already settled), plus the three file-add styles.

function AddLinkRow({ store }: { store: Store }) {
  const urlRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      new URL(url);
    } catch {
      setError("Ange en giltig länk.");
      return;
    }
    setPending(true);
    try {
      await store.addLink(url, label.trim());
      setError(null);
      setUrl("");
      setLabel("");
      urlRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte lägga till länk");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={urlRef}
          type="url"
          placeholder="https://…"
          aria-label="Länk"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-48 flex-[2]"
        />
        <Input
          placeholder="Etikett (valfritt)"
          aria-label="Etikett (valfritt)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
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

function AddFileRow({ store, mode }: { store: Store; mode: FileAddMode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setPending(true);
    try {
      await store.uploadFile(file);
      setError(null);
      setSelected(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte ladda upp fil");
    } finally {
      setPending(false);
    }
  }

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={PIECE_FILE_ACCEPT_ATTR}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void upload(file);
      }}
    />
  );

  return (
    <div className="space-y-2">
      {mode === "pick" ? (
        <div>
          {hiddenInput}
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" aria-hidden="true" />
            {pending ? "Laddar upp…" : "Ladda upp fil"}
          </Button>
        </div>
      ) : mode === "button" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={inputRef}
            type="file"
            accept={PIECE_FILE_ACCEPT_ATTR}
            aria-label="Fil"
            disabled={pending}
            onChange={(e) => setSelected(e.target.files?.[0] ?? null)}
            className="min-w-48 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending || !selected}
            onClick={() => selected && upload(selected)}
          >
            <Upload className="size-4" aria-hidden="true" />
            {pending ? "Laddar upp…" : "Ladda upp"}
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void upload(file);
          }}
          className={cn(
            "flex flex-wrap items-center justify-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground",
            dragOver && "border-primary bg-primary/5"
          )}
        >
          {hiddenInput}
          <Upload className="size-4" aria-hidden="true" />
          {pending ? (
            <span>Laddar upp…</span>
          ) : (
            <>
              <span>Släpp en fil här eller</span>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={() => inputRef.current?.click()}
              >
                välj fil
              </Button>
            </>
          )}
        </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant A: today's roomy bordered rows, text buttons swapped for icons that
// stay on the right edge. Download becomes an icon too.

function VariantA({ store, options, readOnly }: VariantProps) {
  const fileMut = useListMutation(options.errorPlacement);
  const linkMut = useListMutation(options.errorPlacement);

  return (
    <>
      <SectionCard
        title="Filer"
        readOnly={readOnly}
        empty={store.files.length === 0}
        emptyCopy="Inga filer uppladdade ännu."
        listError={fileMut.listError}
        addRow={<AddFileRow store={store} mode={options.fileAddMode} />}
        list={
          <ul className="space-y-2">
            {store.files.map((file) => (
              <li key={file.id} className="space-y-1 rounded border p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} · {formatUploadedAt(file.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <IconButton
                      label={`Ladda ner ${file.displayName}`}
                      disabled={fileMut.busyId === file.id}
                      onClick={() => fileMut.run(file.id, () => store.downloadFile(file.id))}
                    >
                      <Download className="size-3.5" aria-hidden="true" />
                    </IconButton>
                    {readOnly ? null : (
                      <>
                        <RenameFilePopover file={file} store={store} />
                        <ReplaceFilePopover file={file} store={store} />
                        <IconButton
                          label={`Ta bort fil ${file.displayName}`}
                          disabled={fileMut.busyId === file.id}
                          onClick={() => fileMut.run(file.id, () => store.removeFile(file.id))}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </IconButton>
                      </>
                    )}
                  </div>
                </div>
                <RowError message={fileMut.rowError(file.id)} />
              </li>
            ))}
          </ul>
        }
      />
      <SectionCard
        title="Länkar"
        readOnly={readOnly}
        empty={store.links.length === 0}
        emptyCopy="Inga länkar tillagda ännu."
        listError={linkMut.listError}
        addRow={<AddLinkRow store={store} />}
        list={
          <ul className="space-y-2">
            {store.links.map((link) => (
              <li key={link.id} className="space-y-1 rounded border p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {labelForLink(link)}
                    </a>
                    <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                  </div>
                  {readOnly ? null : (
                    <div className="flex shrink-0 items-center">
                      <EditLinkPopover link={link} store={store} />
                      <IconButton
                        label={`Ta bort länk ${labelForLink(link)}`}
                        disabled={linkMut.busyId === link.id}
                        onClick={() => linkMut.run(link.id, () => store.removeLink(link.id))}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </IconButton>
                    </div>
                  )}
                </div>
                <RowError message={linkMut.rowError(link.id)} />
              </li>
            ))}
          </ul>
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Variant B: credit-style dense rows. Name is the download/open affordance,
// metadata sits inline as muted text, actions follow the content directly.

function VariantB({ store, options, readOnly }: VariantProps) {
  const fileMut = useListMutation(options.errorPlacement);
  const linkMut = useListMutation(options.errorPlacement);

  return (
    <>
      <SectionCard
        title="Filer"
        readOnly={readOnly}
        empty={store.files.length === 0}
        emptyCopy="Inga filer uppladdade ännu."
        listError={fileMut.listError}
        addRow={<AddFileRow store={store} mode={options.fileAddMode} />}
        list={
          <ul className="space-y-2 text-sm">
            {store.files.map((file) => (
              <li key={file.id}>
                <div className="flex min-h-7 flex-wrap items-center gap-x-2">
                  {/* Icon and name stay on one line; the name truncates instead. */}
                  <span className="inline-flex min-w-0 max-w-full items-center gap-2">
                    <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <button
                      type="button"
                      onClick={() => fileMut.run(file.id, () => store.downloadFile(file.id))}
                      disabled={fileMut.busyId === file.id}
                      className="min-w-0 truncate text-left font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      {fileMut.busyId === file.id ? "Hämtar..." : file.displayName}
                    </button>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} · {formatUploadedAt(file.createdAt, false)}
                  </span>
                  {readOnly ? null : (
                    <span className="inline-flex items-center">
                      <RenameFilePopover file={file} store={store} />
                      <ReplaceFilePopover file={file} store={store} />
                      <IconButton
                        label={`Ta bort fil ${file.displayName}`}
                        disabled={fileMut.busyId === file.id}
                        onClick={() => fileMut.run(file.id, () => store.removeFile(file.id))}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </IconButton>
                    </span>
                  )}
                </div>
                <RowError message={fileMut.rowError(file.id)} />
              </li>
            ))}
          </ul>
        }
      />
      <SectionCard
        title="Länkar"
        readOnly={readOnly}
        empty={store.links.length === 0}
        emptyCopy="Inga länkar tillagda ännu."
        listError={linkMut.listError}
        addRow={<AddLinkRow store={store} />}
        list={
          <ul className="space-y-2 text-sm">
            {store.links.map((link) => (
              <li key={link.id}>
                <div className="flex min-h-7 flex-wrap items-center gap-x-2">
                  <span className="inline-flex min-w-0 max-w-full items-center gap-2">
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 truncate font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {labelForLink(link)}
                    </a>
                  </span>
                  {link.label ? (
                    <span className="text-xs text-muted-foreground">{hostnameOf(link.url)}</span>
                  ) : null}
                  {readOnly ? null : (
                    <span className="inline-flex items-center">
                      <EditLinkPopover link={link} store={store} />
                      <IconButton
                        label={`Ta bort länk ${labelForLink(link)}`}
                        disabled={linkMut.busyId === link.id}
                        onClick={() => linkMut.run(link.id, () => store.removeLink(link.id))}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </IconButton>
                    </span>
                  )}
                </div>
                <RowError message={linkMut.rowError(link.id)} />
              </li>
            ))}
          </ul>
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Variant C: the Noter list's compact rows as-is. No metadata, name stretches,
// actions pinned to the right edge.

function VariantC({ store, options, readOnly }: VariantProps) {
  const fileMut = useListMutation(options.errorPlacement);
  const linkMut = useListMutation(options.errorPlacement);

  return (
    <>
      <SectionCard
        title="Filer"
        readOnly={readOnly}
        empty={store.files.length === 0}
        emptyCopy="Inga filer uppladdade ännu."
        listError={fileMut.listError}
        addRow={<AddFileRow store={store} mode={options.fileAddMode} />}
        list={
          <ul className="space-y-2 text-sm">
            {store.files.map((file) => (
              <li key={file.id} className="space-y-1">
                <div className="flex min-w-0 items-center gap-1">
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <button
                    type="button"
                    onClick={() => fileMut.run(file.id, () => store.downloadFile(file.id))}
                    disabled={fileMut.busyId === file.id}
                    className="min-w-0 flex-1 truncate text-left text-primary underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    {fileMut.busyId === file.id ? "Hämtar..." : file.displayName}
                  </button>
                  {readOnly ? null : (
                    <>
                      <RenameFilePopover file={file} store={store} />
                      <ReplaceFilePopover file={file} store={store} />
                      <IconButton
                        label={`Ta bort fil ${file.displayName}`}
                        disabled={fileMut.busyId === file.id}
                        onClick={() => fileMut.run(file.id, () => store.removeFile(file.id))}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </IconButton>
                    </>
                  )}
                </div>
                <RowError message={fileMut.rowError(file.id)} />
              </li>
            ))}
          </ul>
        }
      />
      <SectionCard
        title="Länkar"
        readOnly={readOnly}
        empty={store.links.length === 0}
        emptyCopy="Inga länkar tillagda ännu."
        listError={linkMut.listError}
        addRow={<AddLinkRow store={store} />}
        list={
          <ul className="space-y-2 text-sm">
            {store.links.map((link) => (
              <li key={link.id} className="space-y-1">
                <div className="flex min-w-0 items-center gap-1">
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-primary underline-offset-4 hover:underline"
                  >
                    {labelForLink(link)}
                  </a>
                  {readOnly ? null : (
                    <>
                      <EditLinkPopover link={link} store={store} />
                      <IconButton
                        label={`Ta bort länk ${labelForLink(link)}`}
                        disabled={linkMut.busyId === link.id}
                        onClick={() => linkMut.run(link.id, () => store.removeLink(link.id))}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </IconButton>
                    </>
                  )}
                </div>
                <RowError message={linkMut.rowError(link.id)} />
              </li>
            ))}
          </ul>
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Variant D: a table. Metadata gets its own columns; the date column hides on
// phones. Actions sit in the last column.

function VariantD({ store, options, readOnly }: VariantProps) {
  const fileMut = useListMutation(options.errorPlacement);
  const linkMut = useListMutation(options.errorPlacement);

  return (
    <>
      <SectionCard
        title="Filer"
        readOnly={readOnly}
        empty={store.files.length === 0}
        emptyCopy="Inga filer uppladdade ännu."
        listError={fileMut.listError}
        addRow={<AddFileRow store={store} mode={options.fileAddMode} />}
        list={
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Namn</TableHead>
                <TableHead className="w-20">Storlek</TableHead>
                <TableHead className="hidden w-40 sm:table-cell">Uppladdad</TableHead>
                {readOnly ? null : <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="whitespace-normal">
                    <button
                      type="button"
                      onClick={() => fileMut.run(file.id, () => store.downloadFile(file.id))}
                      disabled={fileMut.busyId === file.id}
                      className="block max-w-full truncate text-left font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      {fileMut.busyId === file.id ? "Hämtar..." : file.displayName}
                    </button>
                    <RowError message={fileMut.rowError(file.id)} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatFileSize(file.size)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatUploadedAt(file.createdAt)}
                  </TableCell>
                  {readOnly ? null : (
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <RenameFilePopover file={file} store={store} />
                        <ReplaceFilePopover file={file} store={store} />
                        <IconButton
                          label={`Ta bort fil ${file.displayName}`}
                          disabled={fileMut.busyId === file.id}
                          onClick={() => fileMut.run(file.id, () => store.removeFile(file.id))}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </IconButton>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
      />
      <SectionCard
        title="Länkar"
        readOnly={readOnly}
        empty={store.links.length === 0}
        emptyCopy="Inga länkar tillagda ännu."
        listError={linkMut.listError}
        addRow={<AddLinkRow store={store} />}
        list={
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Etikett</TableHead>
                <TableHead className="hidden sm:table-cell">Adress</TableHead>
                {readOnly ? null : <TableHead className="w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="whitespace-normal">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {labelForLink(link)}
                    </a>
                    <RowError message={linkMut.rowError(link.id)} />
                  </TableCell>
                  <TableCell className="hidden truncate text-muted-foreground sm:table-cell">
                    {link.url}
                  </TableCell>
                  {readOnly ? null : (
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <EditLinkPopover link={link} store={store} />
                        <IconButton
                          label={`Ta bort länk ${labelForLink(link)}`}
                          disabled={linkMut.busyId === link.id}
                          onClick={() => linkMut.run(link.id, () => store.removeLink(link.id))}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </IconButton>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
      />
    </>
  );
}
