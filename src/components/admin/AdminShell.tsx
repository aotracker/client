import { AdminNav } from "./AdminNav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="lg:w-44 shrink-0">
          <div className="sticky top-6 space-y-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Admin
            </p>
            <AdminNav />
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
