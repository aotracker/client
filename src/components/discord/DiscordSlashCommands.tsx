import { getTranslations } from "next-intl/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const COMMANDS = [
  { name: "/track", key: "track" },
  { name: "/kills-channel", key: "killsChannel" },
  { name: "/deaths-channel", key: "deathsChannel" },
  { name: "/battles-channel", key: "battlesChannel" },
  { name: "/live-channel", key: "liveChannel" },
  { name: "/untrack", key: "untrack" },
  { name: "/status", key: "status" },
  { name: "/feed-filters", key: "feedFilters" },
  { name: "/ping-role", key: "pingRole" },
  { name: "/whoami", key: "whoami" },
  { name: "/lookup", key: "lookup" },
  { name: "/feud", key: "feud" },
  { name: "/watchlist-add", key: "watchlistAdd" },
] as const;

const COMMAND_GROUPS = [
  {
    key: "tracking" as const,
    commandKeys: [
      "track",
      "killsChannel",
      "deathsChannel",
      "battlesChannel",
      "liveChannel",
      "untrack",
    ] as const,
  },
  {
    key: "notifications" as const,
    commandKeys: ["feedFilters", "pingRole"] as const,
  },
  {
    key: "lookups" as const,
    commandKeys: [
      "status",
      "whoami",
      "lookup",
      "feud",
      "watchlistAdd",
    ] as const,
  },
] as const;

type CommandKey = (typeof COMMANDS)[number]["key"];

interface CommandCopy {
  usage: string;
  summary: string;
  detail: string;
  example: string;
}

export async function DiscordSlashCommands() {
  const t = await getTranslations("Discord");
  const commandCopy = t.raw("commands") as Record<CommandKey, CommandCopy>;
  const commandsByKey = new Map(COMMANDS.map((cmd) => [cmd.key, cmd]));

  return (
    <div className="space-y-6">
      {COMMAND_GROUPS.map((group) => (
        <div key={group.key} className="space-y-2">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              {t(`commandGroups.${group.key}.title`)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(`commandGroups.${group.key}.description`)}
            </p>
          </div>
          <Accordion>
            {group.commandKeys.map((key) => {
              const cmd = commandsByKey.get(key);
              const copy = commandCopy[key];
              if (!cmd) return null;
              return (
                <AccordionItem key={key}>
                  <AccordionTrigger>
                    <h4 className="font-mono text-sm font-semibold text-foreground">
                      {cmd.name}
                    </h4>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {copy.summary}
                    </p>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    <p>
                      <span className="text-label">{t("usageLabel")}</span>
                      <code className="mt-1 block overflow-x-auto rounded-md bg-muted px-3 py-1.5 font-mono text-sm text-foreground">
                        {copy.usage}
                      </code>
                    </p>
                    <p>{copy.detail}</p>
                    <p>
                      <span className="text-label">{t("exampleLabel")}</span>
                      <code className="mt-1 block overflow-x-auto rounded-md bg-muted px-3 py-1.5 font-mono text-sm text-foreground">
                        {copy.example}
                      </code>
                    </p>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      ))}
    </div>
  );
}
