import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div className="stack" style={{ justifyItems: 'center' }}>
        <span className="eyebrow">404</span>
        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.045em' }}>Diese Seite gibt es nicht</h1>
        <p className="muted">Vielleicht wurde der Name geändert oder ist noch frei.</p>
        <Link href="/" className="btn btn-white">Zur Startseite</Link>
      </div>
    </main>
  );
}
