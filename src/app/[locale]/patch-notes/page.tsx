import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { PageHeader } from "@/components/PageSection";
import { PatchNotesList } from "@/components/patch-notes/PatchNotesList";
import { getAlbionPatchNotes } from "@/lib/db/queries";
import { buildPageMetadata } from "@/lib/seo";
import { ALBION_PATCH_NOTES_BOARD_URL } from "@/lib/site";

interface PatchNotesPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: PatchNotesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PatchNotes" });

  return buildPageMetadata({
    title: t("title"),
    description: t("metaDescription"),
    canonicalPath: "/patch-notes",
    locale,
  });
}

export default async function PatchNotesPage({ params }: PatchNotesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("PatchNotes");

  let feed: Awaited<ReturnType<typeof getAlbionPatchNotes>> | null = null;
  let dbError = false;

  try {
    feed = await getAlbionPatchNotes();
  } catch {
    dbError = true;
  }

  const items = feed?.items ?? [];
  const failed = dbError || (items.length === 0 && Boolean(feed?.lastError));
  const empty = !failed && items.length === 0;

  return (
    <div className="mx-auto w-full space-y-6 2xl:relative 2xl:left-1/2 2xl:w-[min(85rem,calc(100vw-2rem))] 2xl:max-w-none 2xl:-translate-x-1/2">
      <PageHeader title={t("title")} description={t("description")} />

      <p className="text-sm text-muted-foreground">
        {t.rich("source", {
          forumLink: (chunks) => (
            <a
              href={ALBION_PATCH_NOTES_BOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              {chunks}
            </a>
          ),
        })}
      </p>

      {failed ? (
        <InlineAlert>
          {t.rich("error", {
            forumLink: (chunks) => (
              <a
                href={ALBION_PATCH_NOTES_BOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-2"
              >
                {chunks}
              </a>
            ),
          })}
        </InlineAlert>
      ) : null}

      {empty ? (
        <EmptyState icon={ScrollText} title={t("empty")}>
          {t.rich("emptyHint", {
            forumLink: (chunks) => (
              <a
                href={ALBION_PATCH_NOTES_BOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2"
              >
                {chunks}
              </a>
            ),
          })}
        </EmptyState>
      ) : null}

      {items.length > 0 ? (
        <PatchNotesList items={items} readOnForumLabel={t("readOnForum")} />
      ) : null}
    </div>
  );
}
