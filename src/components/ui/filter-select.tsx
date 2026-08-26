"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterSelectOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  suffix?: ReactNode;
};

export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      {children}
    </div>
  );
}

export function FilterCheckbox({
  label,
  checked,
  onChange,
  title,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      title={title}
      className="flex h-8 cursor-pointer items-center gap-2 text-sm"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 rounded-sm border-border accent-primary"
      />
      {label}
    </label>
  );
}

export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className,
  align = "start",
  fit = false,
  "aria-label": ariaLabel,
}: {
  label?: string;
  value: T;
  options: FilterSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  align?: "start" | "end";
  /** Size the trigger to the selected label instead of a fixed min width. */
  fit?: boolean;
  "aria-label"?: string;
}) {
  const listId = useId();
  const labelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const SelectedIcon = selected?.icon;
  const accessibleName = ariaLabel ?? label;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative inline-block",
        fit ? "w-fit" : "min-w-40",
        className
      )}
    >
      {label ? (
        <p
          id={labelId}
          className="text-label mb-1.5"
        >
          {label}
        </p>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-left text-sm font-medium text-foreground transition-colors",
          fit ? "w-auto" : "w-full",
          "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          "disabled:pointer-events-none disabled:opacity-50"
        )}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label={label ? undefined : accessibleName}
        aria-labelledby={label ? labelId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {SelectedIcon ? (
          <SelectedIcon
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        ) : null}
        <span className={cn(fit ? "shrink-0" : "min-w-0 flex-1 truncate")}>
          {selected?.label}
        </span>
        {selected?.suffix ? (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {selected.suffix}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label={accessibleName}
          className={cn(
            "absolute z-50 mt-1 min-w-full overflow-hidden rounded-md border border-border bg-background p-1 text-foreground shadow-lg",
            "max-h-64 overflow-y-auto",
            fit && "w-max",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => {
                  setOpen(false);
                  if (option.value !== value) onChange(option.value);
                }}
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isSelected ? "text-primary opacity-100" : "opacity-0"
                  )}
                  aria-hidden
                />
                {Icon ? (
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.suffix ? (
                  <span className="shrink-0 text-xs tabular-nums opacity-80">
                    {option.suffix}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
