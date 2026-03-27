import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const t = useTranslations("auth");
  return <h1 className="text-2xl font-bold">{t("registerTitle")}</h1>;
}
