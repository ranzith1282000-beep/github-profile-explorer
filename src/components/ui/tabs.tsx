import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Tab<T extends string> {
  value: T;
  label: ReactNode;
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  children: (value: T, panelProps: { id: string; role: "tabpanel"; "aria-labelledby": string; tabIndex: 0 }) => ReactNode;
}

/** Accessible tabs following the WAI-ARIA pattern: arrow keys, Home and End move between tabs. */
export function Tabs<T extends string>({ tabs, value, onChange, label, children }: TabsProps<T>) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabId = (v: T) => `${base}-tab-${v}`;
  const panelId = (v: T) => `${base}-panel-${v}`;

  function onKeyDown(e: KeyboardEvent, index: number) {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
        {tabs.map((tab, i) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={tabId(tab.value)}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={panelId(tab.value)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        {children(value, { id: panelId(value), role: "tabpanel", "aria-labelledby": tabId(value), tabIndex: 0 })}
      </div>
    </div>
  );
}
