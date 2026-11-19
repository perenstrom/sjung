"use client";

import { Check, Folder, Plus, X } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";

import { SearchCombobox, useCloseSearchCombobox } from "@/components/SearchCombobox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  categorySuggestions,
  MAX_CATEGORY_LENGTH,
  rankCategories,
  shouldOfferNewCategory,
} from "@/lib/pieces/categories";
import { normalizeSpacing } from "@/lib/text/match-key";
import { cn } from "@/lib/utils";

const CategoriesContext = createContext<string[]>(rankCategories([]));

/** Gives the pickers below the Group's Categories, ranked (see `getCategories`). */
export function PieceCategoriesProvider({
  categories,
  children,
}: {
  categories: string[];
  children: ReactNode;
}) {
  return <CategoriesContext.Provider value={categories}>{children}</CategoriesContext.Provider>;
}

/**
 * A labelled Category picker for a form popover's fields, starting from
 * `defaultValue` each time the popover opens.
 */
export function CategoryField({ defaultValue = null }: { defaultValue?: string | null }) {
  const [category, setCategory] = useState(defaultValue);
  return (
    <div className="space-y-2">
      <Label>Kategori (valfritt)</Label>
      <CategoryPicker value={category} onValueChange={setCategory} className="w-full" />
    </div>
  );
}

const NEW_CATEGORY_ITEM_VALUE = "__new-category__";
const CLEAR_ITEM_VALUE = "__no-category__";

/**
 * Picks at most one Category for a File or Link, built like the Credit role
 * picker: it suggests the Group's Categories in ranking order and accepts new
 * free text. Submits as the form field `category`, empty for none.
 */
export function CategoryPicker({
  value,
  onValueChange,
  ...triggerProps
}: {
  value: string | null;
  onValueChange: (category: string | null) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const categories = useContext(CategoriesContext);
  return (
    <>
      <SearchCombobox
        aria-label="Kategori"
        {...triggerProps}
        selectedLabel={value ?? undefined}
        placeholder="Kategori (valfritt)"
        icon={<Folder className="size-4 shrink-0 opacity-60" aria-hidden="true" />}
      >
        <CategorySearch categories={categories} value={value} onChange={onValueChange} />
      </SearchCombobox>
      <input type="hidden" name="category" value={value ?? ""} />
    </>
  );
}

/** Mounts when the picker opens, so the typed text starts empty each time. */
function CategorySearch({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: string | null;
  onChange: (category: string | null) => void;
}) {
  const close = useCloseSearchCombobox();
  const [query, setQuery] = useState("");

  // A Category created here isn't among `categories` yet.
  const listed = value === null || categories.includes(value) ? categories : [...categories, value];
  const matches = categorySuggestions(listed, query);
  const offerNew = shouldOfferNewCategory(listed, query);
  const newCategory = normalizeSpacing(query);

  function pick(category: string | null) {
    onChange(category);
    close();
  }

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder="Sök eller skapa kategori…"
        autoFocus
        value={query}
        maxLength={MAX_CATEGORY_LENGTH}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Ingen kategori hittades.</CommandEmpty>
        {matches.length > 0 && (
          <CommandGroup>
            {matches.map((category) => {
              const checked = category === value;
              return (
                <CommandItem key={category} value={category} onSelect={() => pick(category)}>
                  <Check className={cn("size-4", !checked && "invisible")} aria-hidden="true" />
                  <span className="flex-1">
                    {category}
                    {checked ? <span className="sr-only">, vald</span> : null}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        {offerNew && (
          <CommandGroup>
            <CommandItem value={NEW_CATEGORY_ITEM_VALUE} onSelect={() => pick(newCategory)}>
              <Plus className="size-4" aria-hidden="true" />
              Skapa kategori &quot;{newCategory}&quot;
            </CommandItem>
          </CommandGroup>
        )}
        {value !== null && (
          <CommandGroup>
            <CommandItem value={CLEAR_ITEM_VALUE} onSelect={() => pick(null)}>
              <X className="size-4" aria-hidden="true" />
              Ingen kategori
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
