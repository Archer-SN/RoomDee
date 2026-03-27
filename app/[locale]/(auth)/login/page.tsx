import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("auth");
  return <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>;
}
