import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, type AppLocale } from "./locales";
import { routing } from "./routing";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

const messagesByLocale = { en, es } as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : DEFAULT_LOCALE;

  return {
    locale,
    messages:
      messagesByLocale[locale as AppLocale] ?? messagesByLocale[DEFAULT_LOCALE],
  };
});
