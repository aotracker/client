import { cn } from "@/lib/utils";

export type ButtonVariant = "default" | "outline" | "ghost";
export type ButtonSize = "sm" | "md";

export function buttonClassName({
  variant = "default",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
    variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
    variant === "outline" && "border border-border bg-transparent hover:bg-accent",
    variant === "ghost" && "hover:bg-accent",
    size === "sm" && "h-8 px-3 text-xs",
    size === "md" && "h-10 px-4 text-sm",
    className
  );
}

type ButtonShared = {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type ButtonAsButton = ButtonShared &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonShared &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { variant = "default", size = "md", className, ...rest } = props;
  const classes = buttonClassName({ variant, size, className });

  if ("href" in props && props.href) {
    const { href, ...anchorRest } = rest as ButtonAsLink;
    return <a href={href} className={classes} {...anchorRest} />;
  }

  return <button className={classes} {...(rest as ButtonAsButton)} />;
}
