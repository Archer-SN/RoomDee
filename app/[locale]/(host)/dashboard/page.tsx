import { useTranslations } from "next-intl";

export default function HostDashboardPage() {
  const t = useTranslations("host");
  return <h1 className="text-2xl font-bold">{t("dashboard")}</h1>;
}
