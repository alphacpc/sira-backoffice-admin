import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AnnouncementBar from "@/components/AnnouncementBar";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const gellix = localFont({
  src: [
    { path: "../public/fonts/gellix/GellixThin.otf", weight: "100", style: "normal" },
    { path: "../public/fonts/gellix/GellixThinItalic.otf", weight: "100", style: "italic" },
    { path: "../public/fonts/gellix/GellixLight.otf", weight: "300", style: "normal" },
    { path: "../public/fonts/gellix/GellixLightItalic.otf", weight: "300", style: "italic" },
    { path: "../public/fonts/gellix/GellixRegular.otf", weight: "400", style: "normal" },
    { path: "../public/fonts/gellix/GellixRegularItalic.otf", weight: "400", style: "italic" },
    { path: "../public/fonts/gellix/GellixMedium.otf", weight: "500", style: "normal" },
    { path: "../public/fonts/gellix/GellixMediumItalic.otf", weight: "500", style: "italic" },
    { path: "../public/fonts/gellix/GellixSemiBold.otf", weight: "600", style: "normal" },
    { path: "../public/fonts/gellix/GellixSemiBoldItalic.otf", weight: "600", style: "italic" },
    { path: "../public/fonts/gellix/GellixBold.otf", weight: "700", style: "normal" },
    { path: "../public/fonts/gellix/GellixBoldItalic.otf", weight: "700", style: "italic" },
    { path: "../public/fonts/gellix/GellixExtraBold.otf", weight: "800", style: "normal" },
    { path: "../public/fonts/gellix/GellixExtraBoldItalic.otf", weight: "800", style: "italic" },
    { path: "../public/fonts/gellix/GellixBlack.otf", weight: "900", style: "normal" },
    { path: "../public/fonts/gellix/GellixBlackItalic.otf", weight: "900", style: "italic" },
  ],
  variable: "--font-gellix",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sira — Plateforme SaaS pour le transport interurbain",
  description:
    "Sira est la plateforme SaaS multi-tenant qui unifie flotte, billetterie, colis, RH et facturation pour les compagnies de transport interurbain en Afrique de l'Ouest.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${gellix.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <AnnouncementBar />
        <Nav />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
