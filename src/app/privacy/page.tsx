import type { Metadata } from "next";
import { buildPageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: `Privacy policy for ${SITE_NAME}.`,
  canonicalPath: "/privacy",
  robots: NOINDEX_FOLLOW,
});

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated: August 1, 2026
        </p>
      </div>

      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          {SITE_NAME} (“we”, “our”) provides Albion Online kill and profile
          tracking. This page explains what information we handle when you use
          the site.
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Information we process
          </h2>
          <p>
            We store and display publicly available Albion Online game data such
            as player names, guilds, alliances, kill events, and battle
            statistics retrieved from third-party game APIs. We do not ask you to
            create an account or provide personal contact details to browse the
            site.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Logs and analytics
          </h2>
          <p>
            Our hosting provider may automatically collect standard request logs
            (for example IP address, user agent, and pages requested) for
            security, reliability, and performance. We do not sell personal
            information.
          </p>
          <p>
            We use Google Analytics 4 to understand aggregate traffic and how
            pages are used (for example page views, approximate location, device
            type, and referrers). Google may set cookies or use similar
            technologies and process this data according to{" "}
            <a
              href="https://policies.google.com/privacy"
              className="text-foreground underline underline-offset-2"
              rel="noopener noreferrer"
              target="_blank"
            >
              Google&apos;s Privacy Policy
            </a>
            . You can limit analytics cookies through your browser settings or
            Google&apos;s opt-out tools.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Cookies</h2>
          <p>
            The site may use cookies or similar technologies required for basic
            operation, by our hosting platform, or by Google Analytics (when
            enabled). You can control cookies through your browser settings.
          </p>
          <p>
            Search autocomplete may store recent queries and your preferred
            region in your browser&apos;s local storage only on your device. This
            data is not sent to our servers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Third-party links
          </h2>
          <p>
            Links to Albion Online or other external sites are provided for
            convenience. Their privacy practices are governed by their own
            policies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p>
            If you have questions about this privacy policy, contact the site
            operator through the channels listed on the project repository or
            hosting account for this deployment.
          </p>
        </section>

        <p>
          {SITE_NAME} is not affiliated with Albion Online or Sandbox
          Interactive GmbH.
        </p>
      </div>
    </div>
  );
}
