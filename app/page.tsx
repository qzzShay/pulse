import Link from 'next/link';
import { Icon, Logo } from '@/components/icons';
import { getCurrentUser } from '@/lib/auth';
import { BRAND, SITE_HOST } from '@/lib/config';
import { signupOpen } from '@/lib/data';
import { Claim, Showcase } from './Landing';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [uid, open] = await Promise.all([getCurrentUser(), signupOpen()]);
  return (
    <div className="land-wrap">
      <header className="land-nav">
        <Link href="/" className="brand"><Logo />{BRAND}</Link>
        <nav>
          <Link className="btn btn-ghost btn-sm" href="/explore">Entdecken</Link>
          {uid ? <Link className="btn btn-white btn-sm" href="/dashboard">Zum Dashboard</Link> : (
            <>
              <Link className="btn btn-ghost btn-sm" href="/login">Anmelden</Link>
              {open && <Link className="btn btn-white btn-sm" href="/login?mode=register">Profil anlegen</Link>}
            </>
          )}
        </nav>
      </header>

      <section className="land-hero">
        <span className="announce"><span className="tag">{open ? 'Offen' : 'Bald'}</span>{open ? <>Sichere dir jetzt deinen <b>kurzen Namen</b></> : <>Registrierung startet bald · <b>Namen ab 1 Zeichen</b></>}</span>
        <h1>Dein Profil.<br /><span className="serif">Unverwechselbar.</span></h1>
        <p className="lead">Die Link-in-Bio-Seite für Gamer, Artists, Musiker und Streamer. Kurzer Name, feste UID, Badges, Effekte, Live-Karten und eine Statistik, die Bots herausrechnet.</p>
        <Claim host={SITE_HOST} signupOpen={open} />
        <Showcase host={SITE_HOST} />
      </section>

      <section className="land-sec">
        <div className="land-sec-head">
          <span className="eyebrow">Features</span>
          <h2>Gebaut wie ein <span className="serif">Spielerprofil</span></h2>
          <p>Alles, was eine Bio-Seite braucht, plus die Details, die sonst fehlen.</p>
        </div>
        <div className="bento">
          <div className="tile span-2"><span className="label"><Icon name="sparkles" />Effekt-Engine</span><h3>10 Hintergründe, 5 Cursor, 7 Namenseffekte</h3><p>Flüssig-Chrom, Seide, Retro-Grid, Code-Regen und mehr. Alles übernimmt deine Akzentfarbe und reagiert auf die Maus.</p></div>
          <div className="tile"><div className="big-num">36</div><h3 className="t-foot">Namen mit einem Zeichen</h3><p>Vier Seltenheitsstufen je nach Länge.</p></div>
          <div className="tile"><span className="label"><Icon name="crown" />OG</span><h3 className="t-foot">Feste UID</h3><p>Deine UID zeigt, wann du dazugekommen bist. Die ersten 250 bekommen das OG-Badge.</p></div>
          <div className="tile"><span className="label"><Icon name="card" />Karten-Looks</span><h3 className="t-foot">Frost, Neon, Holo, Brutal …</h3><p>11 Looks für deine Karte, von schlicht bis laut.</p></div>
          <div className="tile span-2"><span className="label"><Icon name="analytics" />Statistik</span><h3>Zahlen ohne Rauschen</h3><p>Bots, Link-Vorschauen und Reloads werden herausgefiltert. Aufrufe, Besucher, Klicks, Klickrate und Quellen, mit Vergleich zum Vorzeitraum.</p></div>
          <div className="tile"><span className="label"><Icon name="music" />Live-Karten</span><h3 className="t-foot">Song, Discord, Video</h3><p>Profilsong mit synchronem Liedtext, Discord-Server, neuestes Video, Spielerkarte und Galerie.</p></div>
          <div className="tile span-2"><span className="label"><Icon name="template" />Vorlagen</span><h3>Für deine Nische gemacht</h3><p>Gaming, Artist, Musik, Streamer, Developer und VRChat: Eine Vorlage setzt Look, Effekte, Badges und Widgets in einem Schritt.</p></div>
          <div className="tile span-2"><span className="label"><Icon name="clock" />Links</span><h3>Planen, pinnen, importieren</h3><p>Links mit Start und Ende, ein angepinnter Haupt-Link und Import von Linktree &amp; Co. per Einfügen.</p></div>
        </div>
      </section>

      <footer className="land-foot"><span>{BRAND}</span><span>{SITE_HOST}</span></footer>
    </div>
  );
}
