import { ImageResponse } from 'next/og';

/** App icon for the home screen (PWA), drawn on the fly in 192 or 512 px. */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const s = size === '512' ? 512 : size === '180' ? 180 : 192;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1430, #07070a)' }}>
        <svg width={s * 0.62} height={s * 0.62} viewBox="0 0 24 24" fill="none" stroke="#b9a6ff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12h4l3-8 6 16 3-8h4" />
        </svg>
      </div>
    ),
    { width: s, height: s },
  );
}
