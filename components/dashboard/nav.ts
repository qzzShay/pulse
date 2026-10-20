/* Dashboard navigation and the settings index searched by ⌘K. */

export const PROFILE_TABS = [
  { id: 'you', label: 'Du', icon: 'userCircle' },
  { id: 'card', label: 'Karte', icon: 'card' },
  { id: 'page', label: 'Seite', icon: 'image' },
  { id: 'text', label: 'Text & Farbe', icon: 'type' },
  { id: 'widgets', label: 'Musik & Widgets', icon: 'music' },
] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number]['id'];

export const NAV = [
  { section: 'Main', items: [
    { href: '/dashboard', label: 'Übersicht', icon: 'overview' },
    { href: '/dashboard/analytics', label: 'Statistik', icon: 'analytics' },
  ] },
  { section: 'Gestalten', items: [
    { href: '/dashboard/profile', label: 'Profil', icon: 'brush', sub: true },
    { href: '/dashboard/links', label: 'Links', icon: 'link' },
    { href: '/dashboard/connections', label: 'Verbindungen', icon: 'plug' },
    { href: '/dashboard/templates', label: 'Vorlagen', icon: 'template' },
    { href: '/dashboard/badges', label: 'Badges', icon: 'badge' },
  ] },
  { section: 'Tools', items: [
    { href: '/dashboard/share', label: 'Teilen', icon: 'share' },
    { href: '/explore', label: 'Entdecken', icon: 'search' },
  ] },
  { section: 'Konto', items: [
    { href: '/dashboard/settings', label: 'Einstellungen', icon: 'settings' },
  ] },
] as const;

/** Only shown to the platform owner. */
export const ADMIN_NAV = [
  { section: 'Owner', items: [{ href: '/dashboard/admin', label: 'Admin', icon: 'users' }] },
] as const;

export const CRUMBS: Record<string, string> = {
  '/dashboard/admin': 'Admin',
  '/dashboard': 'Übersicht',
  '/dashboard/analytics': 'Statistik',
  '/dashboard/profile': 'Profil',
  '/dashboard/links': 'Links',
  '/dashboard/connections': 'Verbindungen',
  '/dashboard/templates': 'Vorlagen',
  '/dashboard/badges': 'Badges',
  '/dashboard/share': 'Teilen',
  '/dashboard/settings': 'Einstellungen',
};

export const SEARCH_INDEX = [
  { label: 'Profilbild ändern', href: '/dashboard/profile?tab=you', group: 'Profil' },
  { label: 'Anzeigename und Bio', href: '/dashboard/profile?tab=you', group: 'Profil' },
  { label: 'Status / Gerade dabei', href: '/dashboard/profile?tab=you', group: 'Profil' },
  { label: 'Karten-Look (Frost, Neon, Brutal …)', href: '/dashboard/profile?tab=card', group: 'Karte' },
  { label: 'Ausrichtung und 3D-Kippen', href: '/dashboard/profile?tab=card', group: 'Karte' },
  { label: 'Hintergrund-Effekt', href: '/dashboard/profile?tab=page', group: 'Seite' },
  { label: 'Cursor-Effekt', href: '/dashboard/profile?tab=page', group: 'Seite' },
  { label: 'Eintritts-Bildschirm', href: '/dashboard/profile?tab=page', group: 'Seite' },
  { label: 'Akzentfarbe', href: '/dashboard/profile?tab=text', group: 'Text & Farbe' },
  { label: 'Namenseffekt (Glitch, Entschlüsseln …)', href: '/dashboard/profile?tab=text', group: 'Text & Farbe' },
  { label: 'Glow-Stärke', href: '/dashboard/profile?tab=text', group: 'Text & Farbe' },
  { label: 'Profilsong und Liedtext', href: '/dashboard/profile?tab=widgets', group: 'Musik & Widgets' },
  { label: 'Discord-Server-Karte', href: '/dashboard/profile?tab=widgets', group: 'Musik & Widgets' },
  { label: 'Galerie', href: '/dashboard/profile?tab=widgets', group: 'Musik & Widgets' },
  { label: 'Spielerkarte', href: '/dashboard/profile?tab=widgets', group: 'Musik & Widgets' },
  { label: 'Discord live verbinden (Status, Spotify)', href: '/dashboard/connections', group: 'Verbindungen' },
  { label: 'Konten verknüpfen (Steam, Twitch, Instagram …)', href: '/dashboard/connections', group: 'Verbindungen' },
  { label: 'Twitch-Live-Anzeige', href: '/dashboard/connections', group: 'Verbindungen' },
  { label: 'Song von YouTube, SoundCloud oder Spotify', href: '/dashboard/profile?tab=widgets', group: 'Musik & Widgets' },
  { label: 'Farbe der Plattform-Logos', href: '/dashboard/profile?tab=text', group: 'Text & Farbe' },
  { label: 'Eigene Badges', href: '/dashboard/badges', group: 'Badges' },
  { label: 'Link hinzufügen', href: '/dashboard/links?new=1', group: 'Links' },
  { label: 'Links importieren', href: '/dashboard/links?import=1', group: 'Links' },
  { label: 'Nischen-Vorlagen', href: '/dashboard/templates', group: 'Vorlagen' },
  { label: 'Badges auswählen', href: '/dashboard/badges', group: 'Badges' },
  { label: 'QR-Code', href: '/dashboard/share', group: 'Teilen' },
  { label: 'Statistik', href: '/dashboard/analytics', group: 'Statistik' },
  { label: 'Name ändern', href: '/dashboard/settings', group: 'Konto' },
  { label: 'Passwort ändern', href: '/dashboard/settings', group: 'Konto' },
  { label: 'Zwei-Faktor-Anmeldung (2FA)', href: '/dashboard/settings', group: 'Konto' },
  { label: 'Speicher und Uploads', href: '/dashboard/settings', group: 'Konto' },
  { label: 'Andere Geräte abmelden', href: '/dashboard/settings', group: 'Konto' },
  { label: 'Banner', href: '/dashboard/profile?tab=you', group: 'Profil' },
  { label: 'Pronomen', href: '/dashboard/profile?tab=you', group: 'Profil' },
  { label: 'Schreibmaschinen-Bio', href: '/dashboard/profile?tab=you', group: 'Profil' },
  { label: 'Eigenes Hintergrundbild oder -video', href: '/dashboard/profile?tab=page', group: 'Seite' },
  { label: 'Eigener Cursor', href: '/dashboard/profile?tab=page', group: 'Seite' },
  { label: 'Tab-Titel und Animation', href: '/dashboard/profile?tab=page', group: 'Seite' },
  { label: 'Überschriften zwischen Links', href: '/dashboard/links', group: 'Links' },
  { label: 'Link-Effekte (Pulsieren, Leuchten …)', href: '/dashboard/links', group: 'Links' },
  { label: 'Statistik als CSV exportieren', href: '/dashboard/analytics', group: 'Statistik' },
  { label: 'Registrierung öffnen', href: '/dashboard/settings', group: 'Konto' },
];
