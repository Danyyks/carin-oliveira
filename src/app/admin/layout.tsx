import type { Metadata, Viewport } from "next";
import RegisterSW from "./RegisterSW";
import InstallButton from "./InstallButton";

// O painel é um PWA próprio ("Painel Carin"), separado do site público:
// manifest e ícone só entram nas páginas /admin, então só o admin é instalável.
export const metadata: Metadata = {
  title: "Painel Carin",
  manifest: "/painel.webmanifest",
  appleWebApp: { capable: true, title: "Painel Carin", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#6d28b8" };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <RegisterSW />
      <InstallButton />
      {children}
    </>
  );
}
