import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Lets people install the dashboard on their phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND} Dashboard`,
    short_name: BRAND,
    description: 'Dein Link-in-Bio-Profil verwalten: Links, Statistik, Community.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Statistik', url: '/dashboard/analytics' },
      { name: 'Links', url: '/dashboard/links' },
    ],
  };
}
