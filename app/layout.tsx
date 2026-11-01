import type { Metadata } from "next";
import localFont from "next/font/local";
import { Fraunces } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

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
  title: {
    default: "Sira — La plateforme des compagnies de transport interurbain",
    template: "%s · Sira",
  },
  description:
    "Sira réunit flotte, billetterie, colis, équipes et conformité dans une seule plateforme pour les compagnies d'autocars d'Afrique de l'Ouest.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${gellix.variable} ${fraunces.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
        >
          Aller au contenu
        </a>
        <Nav />
        <div id="contenu" className="flex-1">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
