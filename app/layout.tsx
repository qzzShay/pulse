import type { Metadata, Viewport } from 'next';
import { BRAND, SITE_URL } from '@/lib/config';
import './globals.css';

// A function so SITE_URL is read when the server runs, not frozen at build time.
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: BRAND, template: `%s · ${BRAND}` },
    description: 'Link-in-Bio-Seiten für Creator, Gamer und Artists.',
    appleWebApp: { capable: true, title: BRAND, statusBarStyle: 'black-translucent' },
    icons: { apple: '/pwa-icon/180' },
  };
}

export const viewport: Viewport = { themeColor: '#050505', colorScheme: 'dark', viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
