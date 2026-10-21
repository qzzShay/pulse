/* Backgrounds for text stories. Shared by the editor and the viewer. */

export const STORY_BGS = {
  accent: 'linear-gradient(160deg, var(--pa, #b9a6ff), var(--pa2, #7cf3e4))',
  sunset: 'linear-gradient(160deg, #ff5f6d, #ffc371)',
  ocean: 'linear-gradient(160deg, #2b5876, #4e4376)',
  neon: 'linear-gradient(160deg, #0f0c29, #302b63 50%, #ff00cc)',
  mint: 'linear-gradient(160deg, #11998e, #38ef7d)',
  mono: 'linear-gradient(160deg, #1b1b1f, #3a3a42)',
} as const;
export type StoryBg = keyof typeof STORY_BGS;
export const storyBg = (id: string) => STORY_BGS[(id in STORY_BGS ? id : 'accent') as StoryBg];
