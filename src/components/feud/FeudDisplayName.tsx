import { cn } from "@/lib/utils";

interface FeudDisplayNameProps {
  name: string;
  tag?: string | null;
  className?: string;
}

/** Alliance or side label with optional `[TAG]` prefix. */
export function FeudDisplayName({ name, tag, className }: FeudDisplayNameProps) {
  const trimmedTag = tag?.trim();
  if (!trimmedTag) {
    return <span className={className}>{name}</span>;
  }

  return (
    <span className={cn("min-w-0", className)}>
      <span className="text-muted-foreground">[{trimmedTag}]</span> {name}
    </span>
  );
}
