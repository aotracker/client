import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelativeTime } from "@/components/RelativeTime";
import type { ForumPatchNoteItem } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function PatchNotesList({
  items,
  readOnForumLabel,
}: {
  items: ForumPatchNoteItem[];
  readOnForumLabel: string;
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.url}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base leading-snug">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {item.title}
                </a>
              </CardTitle>
              <RelativeTime
                date={item.publishedAt}
                className="text-xs text-muted-foreground"
              />
            </CardHeader>
            <CardContent>
              {item.excerpt ? (
                <p className="text-sm text-muted-foreground">{item.excerpt}</p>
              ) : null}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1 text-sm font-medium text-foreground underline underline-offset-2",
                  item.excerpt && "mt-3"
                )}
              >
                {readOnForumLabel}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
