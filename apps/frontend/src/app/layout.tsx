import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "../components/layout/AppShell";

export const metadata: Metadata = {
  title: {
    default: "WebLogros · Club record",
    template: "%s · WebLogros",
  },
  description: "El marcador vivo de los logros de tu equipo.",
};

// 📚 ROOT LAYOUT: envuelve TODAS las páginas del App Router. Aquí viven el shell visual y los
//    landmarks comunes; las páginas de equipo pueden componer su propia navegación contextual.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
