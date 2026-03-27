import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("common");

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <h1 className="text-4xl font-bold mb-4">{t("appName")}</h1>
      <p className="text-lg text-gray-600 mb-8">{t("search")}</p>
      {/* Search bar will be added in Sub-project 3 */}
    </div>
  );
}
