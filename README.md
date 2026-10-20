# pulse

Link-in-Bio-Plattform für Creator, Gamer, Artists, Musiker:innen, Streamer und VRChat-Leute. Profile wie ein Spielerprofil: kurzer Name, feste UID, Badges, Karten-Looks, animierte Hintergründe, Live-Karten und eine Statistik, die Bots herausrechnet.

## Funktionen

- **Öffentliches Profil** unter `/<name>`: 10 Hintergrund-Effekte, 5 Cursor-Effekte, 11 Karten-Looks (5 davon Premium), 7 Namenseffekte, Glow-Regler, 3D-Kippen, Eintritts-Bildschirm, Profilsong mit synchronem Liedtext (LRC), Widgets (Spielerkarte, „Hört gerade“, Discord-Server, neuestes Video, Galerie).
- **Dashboard** unter `/dashboard`:
  - Übersicht: Live-Link, Mitgliedskarte, Kennzahlen, Einrichtungs-Checkliste, Schnellaktionen
  - Statistik: Aufrufe, Besucher, Klicks, Klickrate, Vergleich zum Vorzeitraum, Quellen, Geräte, Länder, Klicks pro Link, Schalter für eigene Aufrufe
  - Profil: Du / Karte / Seite / Text & Farbe / Musik & Widgets, mit Live-Vorschau; Änderungen werden erst mit „Speichern“ übernommen
  - Links: Ziehen zum Sortieren, Anpinnen, Ausblenden, Zeitplan (ab/bis), Import aus Linktree & Co., Klicks und Mini-Kurve pro Link
  - Vorlagen für Nischen: Gaming, Artist, Musik, Streamer, Developer, VRChat
  - Badges, Teilen (QR-Code, Links mit `?ref=`-Quelle), Einstellungen
  - Einstellungssuche mit ⌘K / Strg+K
- **Verbindungen wie bei Discord:** Discord-Live-Status über [Lanyard](https://github.com/Phineas/lanyard) (Status, Spiele mit Laufzeit, eigener Status, Spotify mit Cover und Fortschritt, per WebSocket in Echtzeit), über 60 Plattform-Konten mit echten Marken-Logos ([Simple Icons](https://simpleicons.org)), Twitch-LIVE-Banner über die offizielle Twitch-API.
- **Profilsong** per Link von YouTube (eigener Player, Mini-Video bleibt sichtbar), SoundCloud, Spotify oder als Audiodatei, Titel und Cover werden automatisch geladen; synchroner Liedtext für YouTube und Dateien.
- **Badges** mit eigener Farbe je Badge, drei Darstellungsarten, bis zu 6 eigene Badges mit Symbol und Farbe; Owner-, OG- und Premium-Badges werden serverseitig geprüft.
- **Bot-Schutz:** Proof-of-Work bei Registrierung und Login (ohne Captcha-Dienst, funktioniert auch über HTTP), Honeypot-Feld, Limits pro IP und insgesamt, signierte Aufruf-Tokens, Klicks zählen nur nach einem echten Seitenaufruf und einmal pro 30 Minuten, Erkennung automatisierter Browser, harte Grenzen gegen Fluten der Datenbank, begrenzte Namensprüfung.
- **Statistik ohne Rauschen:** Klicks laufen über `/r/<id>`. Bots (User-Agent), Link-Vorschauen, Reloads innerhalb von 30 Minuten und Aufrufe der eigenen Person werden getrennt gespeichert und nicht mitgezählt. Besucher werden über einen täglich wechselnden Hash gezählt, IP-Adressen werden nicht gespeichert.
- **Konten:** Das erste Konto wird Owner (Plan Legend, OG-Badge). Danach ist die Registrierung geschlossen, bis der Owner sie unter Einstellungen → Plattform öffnet.

## Technik

Next.js 15 (App Router, Server Actions) · React 19 · TypeScript · Drizzle ORM · libSQL/SQLite (lokal als Datei, in der Cloud z. B. Turso) · bcrypt-Passwörter · signierte Sitzungs-Cookies (jose).

## Lokal starten

```bash
npm install
cp .env.example .env.local      # SESSION_SECRET setzen: openssl rand -hex 32
npm run dev                      # http://localhost:3000
```

Beim ersten Aufruf von `/login` legst du dein Owner-Konto an. Die Tabellen werden beim ersten Zugriff automatisch angelegt (`data/pulse.db`).

## Umgebungsvariablen

| Variable | Zweck |
|---|---|
| `SESSION_SECRET` | Pflicht in Produktion. Langer Zufallswert zum Signieren der Sitzung. |
| `DATABASE_URL` | `file:./data/pulse.db` (Standard) oder `libsql://…` für Turso. |
| `DATABASE_AUTH_TOKEN` | Nur für Turso. |
| `SITE_URL` | Öffentliche Adresse, z. B. `https://pulse.gg`. Bestimmt die angezeigten Profil-Links. |
| `BRAND` | Name der Plattform in Logo und Titeln. |
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | Optional, für die Twitch-Live-Anzeige. |

## Deployment

**Mit eigenem Server oder VPS:** Docker + Caddy mit automatischem HTTPS, eingerichtet mit einem Befehl. Siehe [DEPLOY.md](DEPLOY.md).

**Mit Vercel:** Vercel hat kein dauerhaftes Dateisystem. Lege eine kostenlose Turso-Datenbank an und setze `DATABASE_URL=libsql://…` und `DATABASE_AUTH_TOKEN`. Länder in der Statistik kommen dann automatisch über den Header `x-vercel-ip-country`.

## Nächste Schritte, um die Plattform für andere zu öffnen

1. Registrierung in den Einstellungen öffnen (funktioniert schon).
2. Bild-Uploads (Avatar, Galerie, Song) in einen Objektspeicher wie S3/R2 verlegen statt Data-URLs und externer Adressen.
3. Missbrauchsschutz: Rate-Limit für Login, Registrierung und `/api/track`, Captcha bei der Registrierung, Melden-Funktion für Profile.
4. E-Mail-Bestätigung und Passwort vergessen.
5. Zahlungen für Pro/Legend (z. B. Stripe Checkout, Einmalzahlung) und Admin-Ansicht für Owner.
6. Echte Live-Daten für Widgets: Discord-Status (Lanyard), Spotify „Hört gerade“, neuestes YouTube-Video.
7. Eigene Domains pro Profil (Legend).
