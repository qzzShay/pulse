import { getProfile, getUserByUsername } from '@/lib/data';

/** Avatar as an image file, so lists (Explore) do not embed every avatar in the page. */
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await getUserByUsername(decodeURIComponent(username));
  if (!user || user.bannedReason) return new Response(null, { status: 404 });
  const { avatar } = await getProfile(user.id);
  const m = avatar?.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);
  if (m) {
    return new Response(Buffer.from(m[2], 'base64'), {
      headers: { 'content-type': m[1], 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' },
    });
  }
  if (avatar && (avatar.startsWith('/u/') || avatar.startsWith('https://'))) return Response.redirect(new URL(avatar, _req.url), 302);
  return new Response(null, { status: 404 });
}
