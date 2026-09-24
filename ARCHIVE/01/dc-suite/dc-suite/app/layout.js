import { Inter, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import AppHeader from "@/components/shell/AppHeader";
import AppFooter from "@/components/shell/AppFooter";
import ScrollToTop from "@/components/shell/ScrollToTop";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata = {
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description: `${BRAND.tagline}: site screening, lease economics, lifecycle risk and market news for data center development.`,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plexMono.variable} ${inter.className}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <ScrollToTop />
        <AppHeader />
        <div className="shell-main">{children}</div>
        <AppFooter />
        <Analytics />
      </body>
    </html>
  );
}
