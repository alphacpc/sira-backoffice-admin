import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const gellix = localFont({
  src: [
    { path: "../../public/fonts/gellix/GellixRegular.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/gellix/GellixMedium.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/gellix/GellixSemiBold.otf", weight: "600", style: "normal" },
    { path: "../../public/fonts/gellix/GellixBold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-gellix",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sira Backoffice",
  description: "Console d'administration de la plateforme Sira",
  robots: { index: false, follow: false },
  icons: { icon: "/images/sira-favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#0A2A47" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={gellix.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
