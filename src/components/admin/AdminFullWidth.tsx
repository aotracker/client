/** Breaks out of the root max-w-6xl main column to use the full viewport width. */
export function AdminFullWidth({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-4 sm:px-6 lg:px-8"
    >
      {children}
    </div>
  );
}
