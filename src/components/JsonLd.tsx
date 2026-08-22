import { DEFAULT_LOCALE, getLocaleDefinition, withLocalePrefix } from "@/i18n/locales";
import { absoluteUrl, DEFAULT_DESCRIPTION } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function htmlLang(locale?: string): string {
  return getLocaleDefinition(locale ?? DEFAULT_LOCALE).htmlLang;
}

export function websiteJsonLd(options?: {
  locale?: string;
  description?: string;
}): Record<string, unknown> {
  const locale = options?.locale ?? DEFAULT_LOCALE;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl(withLocalePrefix(locale, "/")),
    description: options?.description ?? DEFAULT_DESCRIPTION,
    inLanguage: htmlLang(locale),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl(
          `${withLocalePrefix(locale, "/search")}?q={search_term_string}`
        ),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function playerJsonLd(options: {
  name: string;
  url: string;
  regionLabel: string;
  guildName?: string | null;
  killFame?: number | null;
  deathFame?: number | null;
  inLanguage?: string;
}): Record<string, unknown> {
  const person: Record<string, unknown> = {
    "@type": "Person",
    name: options.name,
    url: options.url,
    description: `Albion Online player on ${options.regionLabel}`,
  };

  if (options.guildName) {
    person.memberOf = {
      "@type": "Organization",
      name: options.guildName,
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: options.name,
    url: options.url,
    inLanguage: options.inLanguage,
    mainEntity: person,
    about: person,
  };
}

export function organizationJsonLd(options: {
  type?: "Organization";
  name: string;
  url: string;
  regionLabel: string;
  memberCount?: number | null;
  description?: string;
  inLanguage?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: options.name,
    url: options.url,
    inLanguage: options.inLanguage,
    description:
      options.description ??
      `Albion Online organization on ${options.regionLabel}`,
    ...(options.memberCount != null
      ? { numberOfEmployees: options.memberCount }
      : {}),
  };
}

export function killJsonLd(options: {
  headline: string;
  url: string;
  datePublished: Date | string;
  description: string;
  killerName?: string | null;
  victimName?: string | null;
  inLanguage?: string;
}): Record<string, unknown> {
  const datePublished =
    typeof options.datePublished === "string"
      ? options.datePublished
      : options.datePublished.toISOString();

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.headline,
    url: options.url,
    datePublished,
    description: options.description,
    inLanguage: options.inLanguage,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    about: [
      options.killerName
        ? { "@type": "Person", name: options.killerName }
        : null,
      options.victimName
        ? { "@type": "Person", name: options.victimName }
        : null,
    ].filter(Boolean),
  };
}

export function battleJsonLd(options: {
  name: string;
  url: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  description: string;
  regionLabel: string;
  inLanguage?: string;
  locale?: string;
}): Record<string, unknown> {
  const startDate = options.startDate
    ? typeof options.startDate === "string"
      ? options.startDate
      : options.startDate.toISOString()
    : undefined;
  const endDate = options.endDate
    ? typeof options.endDate === "string"
      ? options.endDate
      : options.endDate.toISOString()
    : undefined;
  const locale = options.locale ?? DEFAULT_LOCALE;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: options.name,
    url: options.url,
    description: options.description,
    inLanguage: options.inLanguage,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "VirtualLocation",
      name: `Albion Online · ${options.regionLabel}`,
      url: options.url,
    },
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    organizer: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl(withLocalePrefix(locale, "/")),
    },
  };
}
