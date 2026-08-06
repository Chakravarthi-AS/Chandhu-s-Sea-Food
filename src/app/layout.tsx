import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { SiteHeader } from "@/components/SiteHeader";
import { CustomerGreeting } from "@/components/CustomerGreeting";
import { SiteFooter } from "@/components/SiteFooter";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chandhu Sea Food | Fresh Prawns from Nellore — Tirupati",
  description:
    "Order fresh prawns and seafood in Tirupati. Daily imports from Nellore, never frozen, hygienically cleaned. Retail & bulk delivery.",
};

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('csf-theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        style={
          {
            ["--font-display" as string]: "var(--font-fraunces), Georgia, serif",
            ["--font-body" as string]: "var(--font-outfit), system-ui, sans-serif",
          } as React.CSSProperties
        }
      >
        <ThemeProvider>
          <StoreProvider>
            <SiteHeader />
            <CustomerGreeting />
            <main>{children}</main>
            <SiteFooter />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
