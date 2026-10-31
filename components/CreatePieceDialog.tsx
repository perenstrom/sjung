"use client";

import { useRef, useState } from "react";
import { createPerson } from "@/app/actions/people";
import { createPiece } from "@/app/actions/pieces";
import { PersonCombobox } from "@/components/PersonCombobox";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { mergePeople } from "@/lib/people/person-options";
import { ROLES } from "@/lib/roles";
import type { CreditRow, Person } from "@/types/piece-credit-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

export function CreatePieceDialog({
  people,
  groupSlug,
}: {
  people: Person[];
  groupSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [createdPeople, setCreatedPeople] = useState<Person[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const rowIdRef = useRef(0);

  const allPeople = mergePeople(people, createdPeople);

  function nextRowId() {
    return rowIdRef.current++;
  }

  function addCredit() {
    setCredits((prev) => [
      ...prev,
      { id: nextRowId(), personId: "", role: "" },
    ]);
  }

  function removeCredit(id: number) {
    setCredits((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCredit(id: number, field: "personId" | "role", value: string) {
    setCredits((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  async function createPersonForCredit(id: number, name: string) {
    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("name", name);
    const person = await createPerson(formData);
    setCreatedPeople((prev) => [...prev, person]);
    updateCredit(id, "personId", person.id);
  }

  async function handleSubmit(formData: FormData) {
    const validCredits = credits.filter(
      (c) => c.personId !== "" && c.role !== ""
    );
    formData.set(
      "credits",
      JSON.stringify(validCredits.map(({ personId, role }) => ({ personId, role })))
    );
    try {
      await createPiece(formData);
      setError(null);
      setOpen(false);
      setCredits([]);
      rowIdRef.current = 0;
      formRef.current?.reset();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte skapa not"));
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
        <Button>Lägg till</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lägg till noter</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-5">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <div className="space-y-2">
            <Label htmlFor="name">Namn</Label>
            <Input id="name" name="name" required autoFocus />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Medverkande</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCredit}
              >
                Lägg till
              </Button>
            </div>

            {credits.length > 0 && (
              <div className="space-y-2">
                {credits.map((credit) => (
                  <div key={credit.id} className="flex items-center gap-2">
                    <PersonCombobox
                      people={allPeople}
                      value={credit.personId}
                      onValueChange={(v) =>
                        updateCredit(credit.id, "personId", v)
                      }
                      onCreate={(name) =>
                        createPersonForCredit(credit.id, name)
                      }
                      className="min-w-0 flex-1"
                    />

                    <Select
                      value={credit.role}
                      onValueChange={(v) =>
                        updateCredit(credit.id, "role", v)
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Roll" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCredit(credit.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
