import { useTranslations } from "next-intl";

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("host");

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white p-6">
        <h2 className="text-lg font-bold mb-6">{t("dashboard")}</h2>
        <nav className="flex flex-col gap-2">
          <span className="text-sm text-gray-300">{t("properties")}</span>
          <span className="text-sm text-gray-300">{t("bookings")}</span>
          <span className="text-sm text-gray-300">{t("payouts")}</span>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
