import { useTranslations } from "next-intl";

export default function AdminDashboardPage() {
  const t = useTranslations("admin");
  return <h1 className="text-2xl font-bold">{t("dashboard")}</h1>;
}
