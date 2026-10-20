import {
  siAnilist, siApplemusic, siArtstation, siBandcamp, siBattledotnet, siBehance, siBluesky, siBuymeacoffee, siCashapp,
  siChessdotcom, siCodepen, siCrunchyroll, siDeviantart, siDiscord, siDribbble, siEpicgames, siEtsy, siFacebook, siFaceit,
  siFigma, siGithub, siGitlab, siGumroad, siInstagram, siItchdotio, siKick, siKofi, siLastdotfm, siLetterboxd, siLinktree,
  siMastodon, siMedium, siMyanimelist, siNintendoswitch, siOsu, siPatreon, siPaypal, siPinterest, siPixiv, siPlaystation,
  siReddit, siRiotgames, siRoblox, siSnapchat, siSoundcloud, siSpotify, siSteam, siSubstack, siTelegram, siThreads,
  siTidal, siTiktok, siTumblr, siTwitch, siValorant, siVrchat, siWhatsapp, siX, siYoutube, siYoutubemusic,
} from 'simple-icons';

/* One registry for every platform: link detection, connection URLs, brand icon and colour. Shared by server and client. */

export type Platform = {
  key: string;
  label: string;
  /** SVG path on a 24×24 grid, filled. */
  path: string;
  /** Brand colour, already lifted for dark backgrounds. */
  color: string;
  match?: RegExp;
  /** Builds a profile URL from a handle; omitted when there is no public profile page. */
  url?: (h: string) => string;
  /** Hint for the handle field. */
  hint?: string;
  group: 'social' | 'gaming' | 'music' | 'creator' | 'dev' | 'support' | 'other';
};

type Si = { path: string; hex: string };

/** Very dark brand colours (X, GitHub, Steam …) would vanish on a dark profile. */
function lift(hex: string) {
  const n = parseInt(hex, 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 60 ? '#e8e8ec' : `#${hex}`;
}

const at = (h: string) => h.replace(/^@/, '');
const P = (key: string, label: string, icon: Si, group: Platform['group'], opts: Partial<Platform> = {}): Platform =>
  ({ key, label, path: icon.path, color: opts.color ?? lift(icon.hex), group, ...opts });

/* Xbox is not in Simple Icons; simple own glyph. */
const XBOX: Si = { hex: '107C10', path: 'M12 2a10 10 0 0 0-6.9 2.8c1.6-.6 4.2 1.2 6.9 3.4 2.7-2.2 5.3-4 6.9-3.4A10 10 0 0 0 12 2zM4 6.2A10 10 0 0 0 2 12a10 10 0 0 0 3.2 7.3C4.1 16.4 7 11.7 9.6 9 7.2 6.8 5 5.8 4 6.2zm16 0c-1-.4-3.2.6-5.6 2.8 2.6 2.7 5.5 7.4 4.4 10.3A10 10 0 0 0 22 12a10 10 0 0 0-2-5.8zM12 11.3c-2.2 2.1-5.5 6.4-5 8.6A10 10 0 0 0 12 22a10 10 0 0 0 5-2.1c.5-2.2-2.8-6.5-5-8.6z' };
const GLOBE: Si = { hex: 'A5A5B0', path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.6 15.6 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4a14 14 0 0 1 1.9 4h-3.8A14 14 0 0 1 12 4zM4.3 14a8 8 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4zm.8 2h2.9a15.6 15.6 0 0 0 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6A15.6 15.6 0 0 0 8 8zm4 12a14 14 0 0 1-1.9-4h3.8A14 14 0 0 1 12 20zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6a15.6 15.6 0 0 0 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zM16.3 14a16.5 16.5 0 0 0 0-4h3.4a8 8 0 0 1 0 4z' };
const MAIL: Si = { hex: 'A5A5B0', path: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L4.6 7H4v.8l8 5.6 8-5.6V7h-.6z' };

export const PLATFORMS: Platform[] = [
  P('discord', 'Discord', siDiscord, 'social', { match: /discord\.(gg|com)/, hint: 'Benutzername oder Einladungslink' }),
  P('instagram', 'Instagram', siInstagram, 'social', { match: /instagram\.com/, url: h => `https://instagram.com/${at(h)}`, hint: '@name' }),
  P('tiktok', 'TikTok', siTiktok, 'social', { match: /tiktok\.com/, url: h => `https://tiktok.com/@${at(h)}`, hint: '@name', color: '#25f4ee' }),
  P('youtube', 'YouTube', siYoutube, 'creator', { match: /(?<!music\.)youtube\.com|youtu\.be/, url: h => `https://youtube.com/@${at(h)}`, hint: '@kanal' }),
  P('twitch', 'Twitch', siTwitch, 'creator', { match: /twitch\.tv/, url: h => `https://twitch.tv/${at(h)}`, hint: 'Kanalname' }),
  P('kick', 'Kick', siKick, 'creator', { match: /kick\.com/, url: h => `https://kick.com/${at(h)}`, hint: 'Kanalname' }),
  P('x', 'X', siX, 'social', { match: /(^|\/\/|\.)x\.com|twitter\.com/, url: h => `https://x.com/${at(h)}`, hint: '@name' }),
  P('bluesky', 'Bluesky', siBluesky, 'social', { match: /bsky\.app/, url: h => `https://bsky.app/profile/${at(h)}`, hint: 'name.bsky.social' }),
  P('threads', 'Threads', siThreads, 'social', { match: /threads\.net/, url: h => `https://threads.net/@${at(h)}`, hint: '@name' }),
  P('reddit', 'Reddit', siReddit, 'social', { match: /reddit\.com/, url: h => `https://reddit.com/user/${at(h).replace(/^u\//, '')}`, hint: 'u/name' }),
  P('snapchat', 'Snapchat', siSnapchat, 'social', { match: /snapchat\.com/, url: h => `https://snapchat.com/add/${at(h)}`, hint: 'Benutzername', color: '#fffc00' }),
  P('telegram', 'Telegram', siTelegram, 'social', { match: /t\.me|telegram\./, url: h => `https://t.me/${at(h)}`, hint: '@name' }),
  P('whatsapp', 'WhatsApp', siWhatsapp, 'social', { match: /wa\.me|whatsapp\./, hint: 'Telefonnummer oder Link' }),
  P('facebook', 'Facebook', siFacebook, 'social', { match: /facebook\.com|fb\.com/, url: h => `https://facebook.com/${at(h)}` }),
  P('pinterest', 'Pinterest', siPinterest, 'social', { match: /pinterest\./, url: h => `https://pinterest.com/${at(h)}` }),
  P('tumblr', 'Tumblr', siTumblr, 'social', { match: /tumblr\.com/, url: h => `https://${at(h)}.tumblr.com`, color: '#8aa4c8' }),
  P('mastodon', 'Mastodon', siMastodon, 'social', { match: /mastodon|mstdn/, hint: '@name@server' }),

  P('steam', 'Steam', siSteam, 'gaming', { match: /steamcommunity\.com|steampowered\.com/, url: h => (/^\d{17}$/.test(h) ? `https://steamcommunity.com/profiles/${h}` : `https://steamcommunity.com/id/${at(h)}`), hint: 'Profil-ID oder Steam-ID', color: '#66c0f4' }),
  P('xbox', 'Xbox', XBOX, 'gaming', { match: /xbox\.com/, url: h => `https://www.xbox.com/play/user/${encodeURIComponent(h)}`, hint: 'Gamertag', color: '#3dbb3d' }),
  P('playstation', 'PlayStation', siPlaystation, 'gaming', { match: /playstation\.com|psnprofiles/, url: h => `https://psnprofiles.com/${at(h)}`, hint: 'PSN-ID', color: '#4f8cff' }),
  P('nintendo', 'Nintendo Switch', siNintendoswitch, 'gaming', { hint: 'Freundescode SW-…' }),
  P('epicgames', 'Epic Games', siEpicgames, 'gaming', { hint: 'Epic-Name' }),
  P('riot', 'Riot Games', siRiotgames, 'gaming', { hint: 'Name#TAG' }),
  P('valorant', 'Valorant', siValorant, 'gaming', { url: h => `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(h)}/overview`, hint: 'Name#TAG' }),
  P('battlenet', 'Battle.net', siBattledotnet, 'gaming', { hint: 'Name#1234' }),
  P('roblox', 'Roblox', siRoblox, 'gaming', { match: /roblox\.com/, hint: 'Benutzername' }),
  P('vrchat', 'VRChat', siVrchat, 'gaming', { match: /vrchat\.com/, hint: 'Benutzername', color: '#b9a6ff' }),
  P('faceit', 'FACEIT', siFaceit, 'gaming', { match: /faceit\.com/, url: h => `https://faceit.com/players/${at(h)}` }),
  P('osu', 'osu!', siOsu, 'gaming', { match: /osu\.ppy\.sh/, url: h => `https://osu.ppy.sh/users/${at(h)}` }),
  P('chess', 'Chess.com', siChessdotcom, 'gaming', { match: /chess\.com/, url: h => `https://chess.com/member/${at(h)}` }),
  P('itch', 'itch.io', siItchdotio, 'gaming', { match: /itch\.io/, url: h => `https://${at(h)}.itch.io` }),

  P('spotify', 'Spotify', siSpotify, 'music', { match: /spotify\.com/, url: h => (h.startsWith('http') ? h : `https://open.spotify.com/user/${at(h)}`), hint: 'Profil-Link oder Nutzer-ID' }),
  P('soundcloud', 'SoundCloud', siSoundcloud, 'music', { match: /soundcloud\.com/, url: h => `https://soundcloud.com/${at(h)}` }),
  P('applemusic', 'Apple Music', siApplemusic, 'music', { match: /music\.apple\.com/ }),
  P('youtubemusic', 'YouTube Music', siYoutubemusic, 'music', { match: /music\.youtube\.com/ }),
  P('bandcamp', 'Bandcamp', siBandcamp, 'music', { match: /bandcamp\.com/, url: h => `https://${at(h)}.bandcamp.com` }),
  P('tidal', 'TIDAL', siTidal, 'music', { match: /tidal\.com/ }),
  P('lastfm', 'Last.fm', siLastdotfm, 'music', { match: /last\.fm/, url: h => `https://last.fm/user/${at(h)}` }),

  P('artstation', 'ArtStation', siArtstation, 'creator', { match: /artstation\.com/, url: h => `https://artstation.com/${at(h)}` }),
  P('behance', 'Behance', siBehance, 'creator', { match: /behance\.net/, url: h => `https://behance.net/${at(h)}`, color: '#3d7bff' }),
  P('dribbble', 'Dribbble', siDribbble, 'creator', { match: /dribbble\.com/, url: h => `https://dribbble.com/${at(h)}` }),
  P('deviantart', 'DeviantArt', siDeviantart, 'creator', { match: /deviantart\.com/, url: h => `https://deviantart.com/${at(h)}` }),
  P('pixiv', 'pixiv', siPixiv, 'creator', { match: /pixiv\.net/ }),
  P('letterboxd', 'Letterboxd', siLetterboxd, 'creator', { match: /letterboxd\.com/, url: h => `https://letterboxd.com/${at(h)}` }),
  P('myanimelist', 'MyAnimeList', siMyanimelist, 'creator', { match: /myanimelist\.net/, url: h => `https://myanimelist.net/profile/${at(h)}`, color: '#5b8ff9' }),
  P('anilist', 'AniList', siAnilist, 'creator', { match: /anilist\.co/, url: h => `https://anilist.co/user/${at(h)}` }),
  P('crunchyroll', 'Crunchyroll', siCrunchyroll, 'creator', { match: /crunchyroll\.com/ }),
  P('medium', 'Medium', siMedium, 'creator', { match: /medium\.com/, url: h => `https://medium.com/@${at(h)}` }),
  P('substack', 'Substack', siSubstack, 'creator', { match: /substack\.com/, url: h => `https://${at(h)}.substack.com` }),

  P('github', 'GitHub', siGithub, 'dev', { match: /github\.com/, url: h => `https://github.com/${at(h)}` }),
  P('gitlab', 'GitLab', siGitlab, 'dev', { match: /gitlab\.com/, url: h => `https://gitlab.com/${at(h)}` }),
  P('codepen', 'CodePen', siCodepen, 'dev', { match: /codepen\.io/, url: h => `https://codepen.io/${at(h)}` }),
  P('figma', 'Figma', siFigma, 'dev', { match: /figma\.com/, color: '#a259ff' }),

  P('kofi', 'Ko-fi', siKofi, 'support', { match: /ko-fi\.com/, url: h => `https://ko-fi.com/${at(h)}` }),
  P('patreon', 'Patreon', siPatreon, 'support', { match: /patreon\.com/, url: h => `https://patreon.com/${at(h)}`, color: '#ff6f61' }),
  P('paypal', 'PayPal', siPaypal, 'support', { match: /paypal\.(me|com)/, url: h => `https://paypal.me/${at(h)}`, color: '#3d8bff' }),
  P('buymeacoffee', 'Buy Me a Coffee', siBuymeacoffee, 'support', { match: /buymeacoffee\.com/, url: h => `https://buymeacoffee.com/${at(h)}` }),
  P('cashapp', 'Cash App', siCashapp, 'support', { match: /cash\.app/, url: h => `https://cash.app/$${at(h).replace(/^\$/, '')}` }),
  P('gumroad', 'Gumroad', siGumroad, 'support', { match: /gumroad\.com/, url: h => `https://${at(h)}.gumroad.com` }),
  P('etsy', 'Etsy', siEtsy, 'support', { match: /etsy\.com/, url: h => `https://etsy.com/shop/${at(h)}` }),
  P('linktree', 'Linktree', siLinktree, 'other', { match: /linktr\.ee/, url: h => `https://linktr.ee/${at(h)}` }),
  P('email', 'E-Mail', MAIL, 'other', { match: /^mailto:/, url: h => `mailto:${h}`, hint: 'name@beispiel.de' }),
];

export const WEB: Platform = P('web', 'Website', GLOBE, 'other', { url: h => (h.startsWith('http') ? h : `https://${h}`), hint: 'beispiel.de' });

const BY_KEY = new Map([...PLATFORMS, WEB].map(p => [p.key, p]));

export function platformByKey(key: string): Platform {
  return BY_KEY.get(key) ?? WEB;
}

export function platformFor(url: string): Platform {
  const u = url.toLowerCase();
  for (const p of PLATFORMS) if (p.match?.test(u)) return p;
  return WEB;
}

/** Profile URL for a connection, or null when the platform has no public page for a handle. */
export function connectionUrl(key: string, handle: string): string | null {
  const h = handle.trim();
  if (!h) return null;
  if (/^https?:\/\//i.test(h)) return h;
  const p = platformByKey(key);
  return p.url ? p.url(h) : null;
}

export const PLATFORM_GROUPS: [Platform['group'], string][] = [
  ['social', 'Social'], ['gaming', 'Gaming'], ['music', 'Musik'], ['creator', 'Creator'], ['dev', 'Entwicklung'], ['support', 'Support & Shop'], ['other', 'Sonstiges'],
];
