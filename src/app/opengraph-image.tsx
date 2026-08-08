import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { DEFAULT_DESCRIPTION } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} — Albion Online Kill Tracker`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImage({
    title: SITE_NAME,
    subtitle: DEFAULT_DESCRIPTION,
    badge: "Albion Online",
    stats: [
      { label: "Track", value: "Kills" },
      { label: "Profiles", value: "Players" },
      { label: "Coverage", value: "All regions" },
    ],
  });
}
