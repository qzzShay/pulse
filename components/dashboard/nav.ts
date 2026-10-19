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
    { href: '/dashboard/templates', label: 'Vorlagen', icon: 'template' },
    { href: '/dashboard/badges', label: 'Badges', icon: 'badge' },
  ] },
  { section: 'Tools', items: [
    { href: '/dashboard/share', label: 'Teilen', icon: 'share' },
  ] },
  { section: 'Konto', items: [
    { href: '/dashboard/settings', label: 'Einstellungen', icon: 'settings' },
  ] },
] as const;

export const CRUMBS: Record<string, string> = {
  '/dashboard': 'Übersicht',
  '/dashboard/analytics': 'Statistik',
  '/dashboard/profile': 'Profil',
  '/dashboard/links': 'Links',
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
  { label: 'Link hinzufügen', href: '/dashboard/links?new=1', group: 'Links' },
  { label: 'Links importieren', href: '/dashboard/links?import=1', group: 'Links' },
  { label: 'Nischen-Vorlagen', href: '/dashboard/templates', group: 'Vorlagen' },
  { label: 'Badges auswählen', href: '/dashboard/badges', group: 'Badges' },
  { label: 'QR-Code', href: '/dashboard/share', group: 'Teilen' },
  { label: 'Statistik', href: '/dashboard/analytics', group: 'Statistik' },
  { label: 'Name ändern', href: '/dashboard/settings', group: 'Konto' },
  { label: 'Passwort ändern', href: '/dashboard/settings', group: 'Konto' },
  { label: 'Registrierung öffnen', href: '/dashboard/settings', group: 'Konto' },
];
