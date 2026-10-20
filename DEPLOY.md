# Pulse auf einem VPS einrichten

Pulse läuft auf dem Server in Docker: ein Container für die App, einer für Caddy. Caddy holt und erneuert das HTTPS-Zertifikat automatisch. Die Datenbank ist eine SQLite-Datei in `data/`, jede Nacht um 03:30 landet eine Kopie in `backups/` (die letzten 14 bleiben).

## Was du brauchst

- Einen VPS mit **Ubuntu 22.04/24.04 oder Debian 12**, mindestens 1 GB RAM (das Skript legt bei wenig RAM automatisch Swap an) und 10 GB Speicher.
- Eine **Domain** oder Subdomain, z. B. `pulse.deinedomain.de`.
- Beim Domain-Anbieter einen **A-Eintrag**: `pulse.deinedomain.de` → IP-Adresse des VPS. (Für `www.` optional einen zweiten Eintrag, der leitet dann weiter.)

## Einrichten

1. Projekt auf den Server bringen, entweder per Git:
   ```bash
   git clone https://github.com/DEINNAME/pulse.git /opt/pulse
   ```
   oder das Release-Archiv hochladen und entpacken:
   ```bash
   scp pulse-deploy.tar.gz root@SERVER-IP:/opt/
   ssh root@SERVER-IP
   mkdir -p /opt/pulse && tar xzf /opt/pulse-deploy.tar.gz -C /opt/pulse
   ```
2. Setup starten:
   ```bash
   cd /opt/pulse
   sudo bash deploy/setup.sh pulse.deinedomain.de
   ```
   Das Skript installiert Docker, öffnet in der Firewall nur SSH, HTTP und HTTPS, erzeugt die `.env` mit einem zufälligen `SESSION_SECRET`, baut die App, startet alles und richtet das nächtliche Backup ein. Der erste Build dauert ein paar Minuten.
3. `https://pulse.deinedomain.de/login` öffnen und dein Owner-Konto anlegen. Danach ist die Registrierung geschlossen, bis du sie unter **Einstellungen → Plattform** öffnest.

**Ohne Domain (zum Testen):** `sudo bash deploy/setup.sh` ohne Domain starten. Die Seite läuft dann unter `http://SERVER-IP` mit normalem HTTP. Der Browser zeigt „Nicht sicher“, Passwörter werden unverschlüsselt übertragen. Für den echten Betrieb später eine Domain eintragen: in `.env` `DOMAIN` und `SITE_URL=https://…` setzen, die Zeile `CADDYFILE=…` löschen und `docker compose up -d` ausführen.

## Alltag

| Aufgabe | Befehl (im Ordner `/opt/pulse`) |
|---|---|
| Update einspielen | `sudo bash deploy/update.sh` (macht vorher ein Backup) |
| Status ansehen | `docker compose ps` |
| Logs der App | `docker compose logs -f app` |
| Logs von Caddy (Zertifikat) | `docker compose logs -f caddy` |
| Backup sofort | `docker compose exec app node scripts/backup.mjs` |
| Neu starten | `docker compose restart` |

Ohne Git-Checkout: neues Release-Archiv über den Ordner entpacken (`tar xzf … -C /opt/pulse`), dann `sudo bash deploy/update.sh`. `.env`, `data/` und `backups/` bleiben dabei erhalten.

## Backup zurückspielen

```bash
cd /opt/pulse
docker compose stop app
cp backups/pulse-JJJJ-MM-TT-HH-MM.db data/pulse.db
chown 1001:1001 data/pulse.db
docker compose start app
```

Lege Backups zusätzlich ab und zu außerhalb des Servers ab, z. B. mit `scp root@SERVER-IP:/opt/pulse/backups/* .`.

## Einstellungen ändern

In `/opt/pulse/.env`:

| Variable | Bedeutung |
|---|---|
| `DOMAIN` | Domain, für die Caddy das Zertifikat holt |
| `SITE_URL` | Adresse, die in Profil-Links angezeigt wird, z. B. `https://pulse.deinedomain.de` |
| `BRAND` | Name der Plattform in Logo und Titeln |
| `SESSION_SECRET` | Signiert die Logins. Wenn du ihn änderst, werden alle abgemeldet. |

Danach `docker compose up -d` ausführen.

## Optional: Twitch-Live-Anzeige

Damit auf deiner Seite ein LIVE-Banner erscheint, wenn du streamst:

1. Auf [dev.twitch.tv/console](https://dev.twitch.tv/console) eine Anwendung registrieren (OAuth-Weiterleitung: `http://localhost`, Kategorie: Website-Integration).
2. Client-ID und ein neues Client-Secret in `/opt/pulse/.env` eintragen:
   ```
   TWITCH_CLIENT_ID=…
   TWITCH_CLIENT_SECRET=…
   ```
3. `docker compose up -d` ausführen. Im Dashboard unter **Verbindungen** deinen Twitch-Kanal hinzufügen.

Discord-Live-Status und Spotify brauchen keine Einstellung auf dem Server: Das läuft über Lanyard direkt im Browser der Besucher.

## Wenn etwas nicht klappt

- **Kein Zertifikat / Seite nicht erreichbar:** Zeigt der A-Eintrag auf die Server-IP? `dig +short pulse.deinedomain.de` muss die IP ausgeben. Dann `docker compose logs caddy` ansehen. Caddy versucht es automatisch erneut.
- **Ports 80/443 belegt:** Ein anderer Webserver (Apache, nginx) läuft schon. Stoppen mit `systemctl disable --now apache2 nginx`.
- **App startet nicht:** `docker compose logs app`. Fehlt `SESSION_SECRET` in der `.env`, startet sie absichtlich nicht.
