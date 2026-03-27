import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { hasLocale } from "next-intl";

const messageModules = {
  en: () => import("../../../../messages/en.json"),
  th: () => import("../../../../messages/th.json"),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = (await messageModules[locale]()).default;

  return { locale, messages };
});
