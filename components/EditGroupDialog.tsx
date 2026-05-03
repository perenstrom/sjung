"use client";

import { useRef, useState } from "react";
import { updateGroup } from "@/app/actions/groups";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GroupRow = {
  id: string;
  name: string;
};

export function EditGroupDialog({ group }: { group: GroupRow }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    try {
      await updateGroup(formData);
      setError(null);
      setOpen(false);
      formRef.current?.reset();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte spara gruppen"));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Redigera
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redigera grupp</DialogTitle>
        </DialogHeader>
        <form
          key={group.id}
          ref={formRef}
          action={handleSubmit}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={group.id} />
          <div className="space-y-2">
            <Label htmlFor={`edit-group-name-${group.id}`}>Gruppnamn</Label>
            <Input
              id={`edit-group-name-${group.id}`}
              name="name"
              required
              autoFocus
              defaultValue={group.name}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit">Spara</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
