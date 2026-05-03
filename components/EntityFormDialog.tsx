"use client";

/**
 * Compound shell for simple entity CRUD dialogs backed by server actions.
 *
 * Centralizes: controlled shadcn `Dialog`, clearing the error banner when the
 * dialog closes (without resetting field values on dismiss), `getThrownMessage`
 * with a Swedish fallback on failed submits, and closing plus DOM `form.reset()`
 * after a successful action.
 *
 * Consumers pass `fallbackSv` on `Root` and an async `(formData) => …` to `Form`
 * without local try/catch; place `<EntityFormDialog.Error />` where the inline
 * error paragraph used to live.
 *
 * @example
 * ```tsx
 * <EntityFormDialog.Root fallbackSv="Kunde inte spara">
 *   <EntityFormDialog.Trigger asChild>
 *     <Button>Öppna</Button>
 *   </EntityFormDialog.Trigger>
 *   <EntityFormDialog.Content>
 *     <EntityFormDialog.Header>
 *       <EntityFormDialog.Title>Rubrik</EntityFormDialog.Title>
 *     </EntityFormDialog.Header>
 *     <EntityFormDialog.Form action={async (fd) => { await save(fd); }}>
 *       <input name="name" />
 *       <EntityFormDialog.Error />
 *       <Button type="submit">Spara</Button>
 *     </EntityFormDialog.Form>
 *   </EntityFormDialog.Content>
 * </EntityFormDialog.Root>
 * ```
 */

import * as React from "react";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type EntityFormDialogContextValue = {
  setOpen: (open: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  fallbackSv: string;
};

const EntityFormDialogContext =
  React.createContext<EntityFormDialogContextValue | null>(null);

function useEntityFormDialog(part: string): EntityFormDialogContextValue {
  const ctx = React.useContext(EntityFormDialogContext);
  if (!ctx) {
    throw new Error(`${part} must be used within EntityFormDialog.Root`);
  }
  return ctx;
}

export type EntityFormDialogRootProps = {
  children: React.ReactNode;
  /** Swedish fallback for `getThrownMessage` when the thrown value has no message. */
  fallbackSv: string;
};

function Root({ children, fallbackSv }: EntityFormDialogRootProps) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
    }
  }, []);

  const value = React.useMemo(
    () => ({
      setOpen,
      error,
      setError,
      fallbackSv,
    }),
    [error, fallbackSv],
  );

  return (
    <EntityFormDialogContext.Provider value={value}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {children}
      </Dialog>
    </EntityFormDialogContext.Provider>
  );
}

function Trigger(props: React.ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props} />;
}

function Content(props: React.ComponentProps<typeof DialogContent>) {
  return <DialogContent {...props} />;
}

function Header(props: React.ComponentProps<typeof DialogHeader>) {
  return <DialogHeader {...props} />;
}

function Title(props: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle {...props} />;
}

export type EntityFormDialogFormProps = Omit<
  React.ComponentProps<"form">,
  "action"
> & {
  action: (formData: FormData) => Promise<void>;
};

const Form = React.forwardRef<HTMLFormElement, EntityFormDialogFormProps>(
  function Form({ action: actionProp, ...formProps }, ref) {
    const { setError, setOpen, fallbackSv } = useEntityFormDialog(
      "EntityFormDialog.Form",
    );
    const innerRef = React.useRef<HTMLFormElement>(null);

    const mergedRef = React.useCallback(
      (node: HTMLFormElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLFormElement | null>).current =
            node;
        }
      },
      [ref],
    );

    const handleAction = React.useCallback(
      async (formData: FormData) => {
        try {
          await actionProp(formData);
          setError(null);
          setOpen(false);
          innerRef.current?.reset();
        } catch (err) {
          setError(getThrownMessage(err, fallbackSv));
        }
      },
      [actionProp, setError, setOpen, fallbackSv],
    );

    return <form ref={mergedRef} {...formProps} action={handleAction} />;
  },
);

function ErrorMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error } = useEntityFormDialog("EntityFormDialog.Error");
  if (!error) {
    return null;
  }
  return (
    <p
      className={cn("text-sm text-destructive", className)}
      {...props}
    >
      {error}
    </p>
  );
}

export const EntityFormDialog = {
  Root,
  Trigger,
  Content,
  Header,
  Title,
  Form,
  Error: ErrorMessage,
};
