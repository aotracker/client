import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { PageHeader } from "@/components/PageSection";
import { PatchNotesList } from "@/components/patch-notes/PatchNotesList";
import { getAlbionPatchNotes } from "@/lib/db/queries";
import { buildPageMetadata } from "@/lib/seo";
import { ALBION_CHANGELOG_URL } from "@/lib/site";

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
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <p className="text-sm text-muted-foreground">
        {t.rich("source", {
          changelogLink: (chunks) => (
            <a
              href={ALBION_CHANGELOG_URL}
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
            changelogLink: (chunks) => (
              <a
                href={ALBION_CHANGELOG_URL}
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
            changelogLink: (chunks) => (
              <a
                href={ALBION_CHANGELOG_URL}
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
        <PatchNotesList items={items} readOfficialLabel={t("readOfficial")} />
      ) : null}
    </div>
  );
}
