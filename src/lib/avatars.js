// DiceBear avatar library — zero-bundle, URL-built, highly customizable.
// Docs: https://www.dicebear.com/styles
export const AVATAR_STYLES = [
  { id: 'adventurer', label: 'Adventurer' },
  { id: 'personas', label: 'Personas' },
  { id: 'notionists', label: 'Notionists' },
  { id: 'lorelei', label: 'Lorelei' },
  { id: 'micah', label: 'Micah' },
  { id: 'miniavs', label: 'Miniavs' },
  { id: 'open-peeps', label: 'Open Peeps' },
  { id: 'avataaars', label: 'Avataaars' },
];

export const AVATAR_BGS = ['ffdfbf', 'c0aede', 'b6e3f4', 'ffd5dc', 'd1d4f9', 'transparent'];

export function avatarUrl(style = 'adventurer', seed = 'Apex', background = 'ffdfbf') {
  const s = encodeURIComponent(style);
  const params = new URLSearchParams({ seed: String(seed || 'Apex') });
  if (background && background !== 'transparent') params.set('backgroundColor', background);
  else if (background === 'transparent') params.set('backgroundColor', 'transparent');
  return `https://api.dicebear.com/9.x/${s}/svg?${params.toString()}`;
}

export function randomSeed() {
  return Math.random().toString(36).slice(2, 8);
}
