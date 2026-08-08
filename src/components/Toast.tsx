"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ToastItem = {
  id: number;
  message: string;
};

type ToastContextValue = {
  toast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string) => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto rounded-md border border-border bg-card px-4 py-2 text-sm shadow-lg animate-slide-up"
              )}
            >
              {item.message}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

/** Optional no-op safe hook for components that may render outside provider in tests. */
export function useToastOptional(): ToastContextValue["toast"] | null {
  const ctx = useContext(ToastContext);
  return ctx?.toast ?? null;
}
