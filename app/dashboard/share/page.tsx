import QRCode from 'qrcode';
import { requireUser } from '@/lib/auth';
import { SITE_HOST, SITE_URL } from '@/lib/config';
import { CodeLine } from './CodeLine';
import { CopyShare } from '../CopyShare';

export const metadata = { title: 'Teilen' };

const SOURCES = [['tiktok', 'TikTok-Bio'], ['instagram', 'Instagram-Bio'], ['discord', 'Discord-Profil'], ['twitch', 'Twitch-Panel'], ['youtube', 'YouTube-Kanal'], ['qr', 'QR-Code']] as const;

export default async function SharePage() {
  const user = await requireUser();
  const url = `${SITE_URL}/${user.username}`;
  const svg = await QRCode.toString(`${url}?ref=qr`, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } });
  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Tools</span>
        <h1>Teilen</h1>
        <p>Dein Link, ein QR-Code für Stream-Overlays und Merch, und Links mit Quellenangabe, damit die Statistik zeigt, woher deine Besucher kommen.</p>
      </div>
      <section className="hero-card">
        <div className="hero-top" style={{ gridTemplateColumns: 'minmax(0,1fr) 240px' }}>
          <div style={{ minWidth: 0 }}>
            <span className="live-label"><i className="dot dot-live" />Dein Link</span>
            <div className="hero-url">{SITE_HOST}/{user.username}</div>
            <CopyShare url={url} />
          </div>
          <div className="qr-box" dangerouslySetInnerHTML={{ __html: svg }} aria-label="QR-Code zu deiner Seite" role="img" />
        </div>
      </section>
      <section className="card card-pad stack">
        <div className="sec-title"><div><h2 style={{ fontSize: 20 }}>Links mit Quelle</h2><p>Nutze je Plattform einen eigenen Link. Die Statistik ordnet die Aufrufe dann richtig zu.</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Wo</th><th>Link</th></tr></thead>
            <tbody>
              {SOURCES.map(([id, label]) => (
                <tr key={id}><td>{label}</td><td className="mono" style={{ fontSize: 12.5, wordBreak: 'break-all' }}>{url}?ref={id}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card card-pad stack">
        <span className="label">Für GitHub und Websites</span>
        <p className="hint" style={{ margin: 0 }}>Ein Zähler-Badge mit deinen echten Profilaufrufen, z. B. für dein GitHub-Profil-README. Mit <span className="mono">?show=likes</span> zeigt er Likes, mit <span className="mono">&amp;style=pill</span> runde Ecken.</p>
        <div className="row" style={{ gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/${user.username}/badge.svg`} alt="Profilaufrufe" height={20} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/${user.username}/badge.svg?show=likes&style=pill`} alt="Likes" height={20} />
        </div>
        <CodeLine label="Markdown (README)" code={`[![Profilaufrufe](${url}/badge.svg)](${url})`} />
        <CodeLine label="Profilkarte einbetten (HTML)" code={`<iframe src="${SITE_URL}/embed/${user.username}" width="420" height="640" style="border:0;border-radius:24px" loading="lazy"></iframe>`} />
      </section>
    </>
  );
}
