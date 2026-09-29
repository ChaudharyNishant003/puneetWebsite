import type { Metadata, Viewport } from "next";
import { Jost, Mukta } from "next/font/google";
import Script from "next/script";
import { shop } from "@/lib/config";
import "./globals.css";

const jost = Jost({ variable: "--font-jost", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mukta = Mukta({ variable: "--font-mukta", subsets: ["devanagari", "latin"], weight: ["400", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(shop.siteUrl),
  title: { default: `${shop.name} | Kurtas, Sarees, Men, Kids & Innerwear`, template: `%s | ${shop.name}` },
  description: `${shop.name}: ${shop.tagline}. Shop kurta sets, sarees, men's wear, kids wear and innerwear online with COD, free size exchange and delivery across India.`,
  openGraph: { siteName: shop.name, type: "website", locale: "en_IN" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#8e1b3a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="en-IN">
      <body className={`${jost.variable} ${mukta.variable} antialiased`}>
        {children}
        {ga ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}');`}</Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
