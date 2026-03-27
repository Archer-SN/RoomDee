import { useTranslations } from "next-intl";
import { Link } from "@/shared/lib/i18n/routing";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("common");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("appName")}</h1>
        <nav className="flex gap-4">
          <Link href="/" locale="en" className="text-sm">EN</Link>
          <Link href="/" locale="th" className="text-sm">TH</Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-gray-50 px-6 py-4 text-center text-sm text-gray-500">
        &copy; 2026 {t("appName")}
      </footer>
    </div>
  );
}
