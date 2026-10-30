import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "../icons";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** "sheet" slides in from the right (the repo drawer); "center" is a normal modal. */
  variant?: "sheet" | "center";
  className?: string;
  children: ReactNode;
}

/**
 * Built on the native <dialog> element: showModal() gives focus trapping, Esc to close,
 * an inert page behind it and correct screen-reader semantics without extra libraries.
 */
export function Dialog({ open, onOpenChange, title, description, variant = "center", className, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false); // click on the backdrop
      }}
      className={cn(
        "bg-background text-foreground shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px]",
        variant === "sheet"
          ? "dialog-sheet m-0 ml-auto h-dvh max-h-dvh w-full max-w-2xl border-l"
          : "dialog-center m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border",
        className,
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-base font-semibold">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="-mt-1 -mr-2 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Close"
            >
              <Icon name="x" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      )}
    </dialog>
  );
}
