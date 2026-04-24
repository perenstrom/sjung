"use client";

import { useRef, useState } from "react";
import { updateGroup } from "@/app/actions/groups";
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
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await updateGroup(formData);
    setOpen(false);
    formRef.current?.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <div className="flex justify-end">
            <Button type="submit">Spara</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
