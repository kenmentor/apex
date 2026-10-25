// Duolingo-style avatar engine, built on DiceBear.
// Each style has its OWN option names + variant values (fetched from
// https://api.dicebear.com/10.x/<style>/options.json). Sending personas
// params to other styles renders broken/nude avatars — so every style gets
// its own schema + param mapping below.
//
// Styles:
// - personas    = Draftbit Personas (CC BY 4.0) — hair/eyes/mouth/nose/beard/outfit
// - adventurer  = Lisa Wischofsky (CC BY 4.0) — hair/eyes/brows/mouth/glasses/earrings/details
// - avataaars   = Pablo Stanley (free commercial) — top/eyes/brows/mouth/beard/accessories/outfit
// - lorelei     = Lisa Wischofsky (CC0) — hair/eyes/brows/mouth/nose/beard/glasses/face
// - micah       = Micah Lanier (CC BY 4.0) — hair/eyes/brows/mouth/nose/beard/glasses/outfit

export const DICE_VERSION = '10.x'
export const DICE_STYLE = 'personas'

export const DICE_STYLES = [
  { id: 'personas', label: 'Personas' },
  { id: 'adventurer', label: 'Adventurer' },
  { id: 'avataaars', label: 'Avataaars' },
  { id: 'lorelei', label: 'Lorelei' },
  { id: 'micah', label: 'Micah' },
]

export const SKIN_COLORS = ['ffdbb4', 'eed0b6', 'e8b98a', 'd08b5b', '8d5524', '5c3836', '2c1e13']
export const HAIR_COLORS = ['000000', '3b2f2f', '6b4f2a', 'b55242', 'e8b830', 'd6b4fe', 'f5f5f5', 'ff5c5c', '4a90d9', '2c9e6d']
export const CLOTHING_COLORS = ['77311d', '4a90d9', '74d153', 'f5b301', 'ff5c5c', '8e44ad', '2c3e50', 'ffffff', '262e33', 'ffdfbf']
export const BG_COLORS = ['b6e3f4', 'c0aede', 'ffd5dc', 'd1d4f9', 'ffdfbf', 'ffe14d', '74d153', '2c3e50', 'transparent']

const seq = (prefix, from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => prefix + String(from + i).padStart(2, '0'))

// ---- personas (named variants) ----
const PERSONAS_HAIR = ['bald', 'balding', 'beanie', 'bobBangs', 'bobCut', 'bunUndercut', 'buzzcut', 'cap', 'curly', 'curlyBun', 'curlyHighTop', 'extraLong', 'fade', 'long', 'mohawk', 'pigtails', 'shortCombover', 'shortComboverChops', 'sideShave', 'straightBun']
const PERSONAS_EYES = ['glasses', 'happy', 'open', 'sleep', 'sunglasses', 'wink']
const PERSONAS_MOUTH = ['bigSmile', 'frown', 'lips', 'pacifier', 'smile', 'smirk', 'surprise']
const PERSONAS_NOSE = ['mediumRound', 'smallRound', 'wrinkles']
const PERSONAS_BEARD = ['beardMustache', 'goatee', 'pyramid', 'shadow', 'soulPatch', 'walrus']
const PERSONAS_OUTFIT = ['checkered', 'rounded', 'small', 'squared']

// ---- avataaars (named variants) ----
const AVATAAARS_TOP = ['bigHair', 'bob', 'bun', 'curly', 'curvy', 'dreads', 'dreads01', 'dreads02', 'frida', 'frizzle', 'fro', 'froBand', 'hat', 'hijab', 'longButNotTooLong', 'miaWallace', 'shaggy', 'shaggyMullet', 'shavedSides', 'shortCurly', 'shortFlat', 'shortRound', 'shortWaved', 'sides', 'straight01', 'straight02', 'straightAndStrand', 'theCaesar', 'theCaesarAndSidePart', 'turban', 'winterHat02', 'winterHat03', 'winterHat04', 'winterHat1']
const AVATAAARS_EYES = ['closed', 'cry', 'default', 'eyeRoll', 'happy', 'hearts', 'side', 'squint', 'surprised', 'wink', 'winkWacky', 'xDizzy']
const AVATAAARS_BROWS = ['angry', 'angryNatural', 'default', 'defaultNatural', 'flatNatural', 'frownNatural', 'raisedExcited', 'raisedExcitedNatural', 'sadConcerned', 'sadConcernedNatural', 'unibrowNatural', 'upDown', 'upDownNatural']
const AVATAAARS_MOUTH = ['concerned', 'default', 'disbelief', 'eating', 'grimace', 'sad', 'screamOpen', 'serious', 'smile', 'tongue', 'twinkle', 'vomit']
const AVATAAARS_BEARD = ['beardLight', 'beardMajestic', 'beardMedium', 'moustacheFancy', 'moustacheMagnum']
const AVATAAARS_GLASSES = ['eyepatch', 'kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers']
const AVATAAARS_OUTFIT = ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck']

// ---- micah (named variants; skin param is baseColor, outfit color is shirtColor) ----
const MICAH_HAIR = ['dannyPhantom', 'dougFunny', 'fonze', 'full', 'mrClean', 'mrT', 'pixie', 'turban']
const MICAH_EYES = ['eyes', 'eyesShadow', 'round', 'smiling', 'smilingShadow']
const MICAH_BROWS = ['down', 'eyelashesDown', 'eyelashesUp', 'up']
const MICAH_MOUTH = ['frown', 'laughing', 'nervous', 'pucker', 'sad', 'smile', 'smirk', 'surprised']
const MICAH_NOSE = ['curve', 'pointed', 'tound']
const MICAH_BEARD = ['beard', 'scruff']
const MICAH_GLASSES = ['round', 'square']
const MICAH_OUTFIT = ['collared', 'crew', 'open']

// Each style: variant tabs (pick keys stored per-style) + color tabs (shared palette).
// probabilityParam = optional feature (noneValue hides it via probability 0).
export const STYLE_SCHEMAS = {
  personas: {
    variants: [
      { key: 'hair', label: 'Hair', param: 'hairVariant', variants: PERSONAS_HAIR },
      { key: 'eyes', label: 'Eyes', param: 'eyesVariant', variants: PERSONAS_EYES },
      { key: 'mouth', label: 'Mouth', param: 'mouthVariant', variants: PERSONAS_MOUTH },
      { key: 'nose', label: 'Nose', param: 'noseVariant', variants: PERSONAS_NOSE },
      { key: 'beard', label: 'Beard', param: 'facialHairVariant', probabilityParam: 'facialHairProbability', noneValue: 'none', variants: ['none', ...PERSONAS_BEARD] },
      { key: 'outfit', label: 'Outfit', param: 'clothesVariant', variants: PERSONAS_OUTFIT },
    ],
    colors: [
      { key: 'skinColor', label: 'Skin', palette: 'skin' },
      { key: 'hairColor', label: 'Hair color', palette: 'hair', sync: ['beardColor'] },
      { key: 'clothesColor', label: 'Outfit color', palette: 'clothes' },
      { key: 'backgroundColor', label: 'Background', palette: 'bg' },
    ],
    colorParams: { skinColor: 'skinColor', hairColor: 'hairColor', beardColor: 'facialHairColor', clothesColor: 'clothingColor' },
    defaults: { hair: 'shortCombover', eyes: 'open', mouth: 'smile', nose: 'smallRound', beard: 'none', outfit: 'rounded' },
  },
  adventurer: {
    variants: [
      { key: 'hair', label: 'Hair', param: 'hairVariant', variants: [...seq('long', 1, 26), ...seq('short', 1, 19)] },
      { key: 'eyes', label: 'Eyes', param: 'eyesVariant', variants: seq('variant', 1, 26) },
      { key: 'brows', label: 'Brows', param: 'eyebrowsVariant', variants: seq('variant', 1, 15) },
      { key: 'mouth', label: 'Mouth', param: 'mouthVariant', variants: seq('variant', 1, 30) },
      { key: 'glasses', label: 'Glasses', param: 'glassesVariant', probabilityParam: 'glassesProbability', noneValue: 'none', variants: ['none', ...seq('variant', 1, 5)] },
      { key: 'earrings', label: 'Earrings', param: 'earringsVariant', probabilityParam: 'earringsProbability', noneValue: 'none', variants: ['none', ...seq('variant', 1, 6)] },
      { key: 'details', label: 'Details', param: 'detailsVariant', probabilityParam: 'detailsProbability', noneValue: 'none', variants: ['none', 'birthmark', 'blush', 'freckles', 'mustache'] },
    ],
    colors: [
      { key: 'skinColor', label: 'Skin', palette: 'skin' },
      { key: 'hairColor', label: 'Hair color', palette: 'hair', sync: ['beardColor'] },
      { key: 'backgroundColor', label: 'Background', palette: 'bg' },
    ],
    colorParams: { skinColor: 'skinColor', hairColor: 'hairColor' },
    defaults: { hair: 'short01', eyes: 'variant01', brows: 'variant01', mouth: 'variant01', glasses: 'none', earrings: 'none', details: 'none' },
  },
  avataaars: {
    variants: [
      { key: 'top', label: 'Hair', param: 'topVariant', variants: AVATAAARS_TOP },
      { key: 'eyes', label: 'Eyes', param: 'eyesVariant', variants: AVATAAARS_EYES },
      { key: 'brows', label: 'Brows', param: 'eyebrowsVariant', variants: AVATAAARS_BROWS },
      { key: 'mouth', label: 'Mouth', param: 'mouthVariant', variants: AVATAAARS_MOUTH },
      { key: 'beard', label: 'Beard', param: 'facialHairVariant', probabilityParam: 'facialHairProbability', noneValue: 'none', variants: ['none', ...AVATAAARS_BEARD] },
      { key: 'glasses', label: 'Glasses', param: 'accessoriesVariant', probabilityParam: 'accessoriesProbability', noneValue: 'none', variants: ['none', ...AVATAAARS_GLASSES] },
      { key: 'outfit', label: 'Outfit', param: 'clothesVariant', variants: AVATAAARS_OUTFIT },
    ],
    colors: [
      { key: 'skinColor', label: 'Skin', palette: 'skin' },
      { key: 'hairColor', label: 'Hair color', palette: 'hair', sync: ['beardColor'] },
      { key: 'clothesColor', label: 'Outfit color', palette: 'clothes' },
      { key: 'backgroundColor', label: 'Background', palette: 'bg' },
    ],
    colorParams: { skinColor: 'skinColor', hairColor: 'hairColor', beardColor: 'facialHairColor', clothesColor: 'clothesColor' },
    defaults: { top: 'shortRound', eyes: 'default', brows: 'default', mouth: 'smile', beard: 'none', glasses: 'none', outfit: 'shirtCrewNeck' },
  },
  lorelei: {
    variants: [
      { key: 'hair', label: 'Hair', param: 'hairVariant', variants: seq('variant', 1, 48) },
      { key: 'eyes', label: 'Eyes', param: 'eyesVariant', variants: seq('variant', 1, 24) },
      { key: 'brows', label: 'Brows', param: 'eyebrowsVariant', variants: seq('variant', 1, 13) },
      { key: 'mouth', label: 'Mouth', param: 'mouthVariant', variants: [...seq('happy', 1, 18), ...seq('sad', 1, 9)] },
      { key: 'nose', label: 'Nose', param: 'noseVariant', variants: seq('variant', 1, 6) },
      { key: 'face', label: 'Face', param: 'headVariant', variants: seq('variant', 1, 4) },
      { key: 'beard', label: 'Beard', param: 'beardVariant', probabilityParam: 'beardProbability', noneValue: 'none', variants: ['none', 'variant01', 'variant02'] },
      { key: 'glasses', label: 'Glasses', param: 'glassesVariant', probabilityParam: 'glassesProbability', noneValue: 'none', variants: ['none', ...seq('variant', 1, 5)] },
      { key: 'earrings', label: 'Earrings', param: 'earringsVariant', probabilityParam: 'earringsProbability', noneValue: 'none', variants: ['none', 'variant01', 'variant02', 'variant03'] },
    ],
    colors: [
      { key: 'skinColor', label: 'Skin', palette: 'skin' },
      { key: 'hairColor', label: 'Hair color', palette: 'hair', sync: ['beardColor'] },
      { key: 'backgroundColor', label: 'Background', palette: 'bg' },
    ],
    colorParams: { skinColor: 'skinColor', hairColor: 'hairColor' },
    defaults: { hair: 'variant01', eyes: 'variant01', brows: 'variant01', mouth: 'happy01', nose: 'variant01', face: 'variant01', beard: 'none', glasses: 'none', earrings: 'none' },
  },
  micah: {
    variants: [
      { key: 'hair', label: 'Hair', param: 'hairVariant', variants: MICAH_HAIR },
      { key: 'eyes', label: 'Eyes', param: 'eyesVariant', variants: MICAH_EYES },
      { key: 'brows', label: 'Brows', param: 'eyebrowsVariant', variants: MICAH_BROWS },
      { key: 'mouth', label: 'Mouth', param: 'mouthVariant', variants: MICAH_MOUTH },
      { key: 'nose', label: 'Nose', param: 'noseVariant', variants: MICAH_NOSE },
      { key: 'beard', label: 'Beard', param: 'facialHairVariant', probabilityParam: 'facialHairProbability', noneValue: 'none', variants: ['none', ...MICAH_BEARD] },
      { key: 'glasses', label: 'Glasses', param: 'glassesVariant', probabilityParam: 'glassesProbability', noneValue: 'none', variants: ['none', ...MICAH_GLASSES] },
      { key: 'outfit', label: 'Outfit', param: 'clothesVariant', variants: MICAH_OUTFIT },
    ],
    colors: [
      { key: 'skinColor', label: 'Skin', palette: 'skin' },
      { key: 'hairColor', label: 'Hair color', palette: 'hair', sync: ['beardColor'] },
      { key: 'clothesColor', label: 'Outfit color', palette: 'clothes' },
      { key: 'backgroundColor', label: 'Background', palette: 'bg' },
    ],
    colorParams: { skinColor: 'baseColor', hairColor: 'hairColor', beardColor: 'facialHairColor', clothesColor: 'shirtColor' },
    defaults: { hair: 'full', eyes: 'eyes', brows: 'up', mouth: 'smile', nose: 'pointed', beard: 'none', glasses: 'none', outfit: 'crew' },
  },
}

export function schemaFor(style) {
  return STYLE_SCHEMAS[style] || STYLE_SCHEMAS[DICE_STYLE]
}

export function randomSeed(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len)
}

function defaultPicks() {
  const picks = {}
  for (const [style, schema] of Object.entries(STYLE_SCHEMAS)) {
    picks[style] = { ...schema.defaults }
  }
  return picks
}

export function defaultDiceConfig(overrides = {}) {
  return {
    engine: 'dicebear',
    style: DICE_STYLE,
    seed: randomSeed(),
    backgroundColor: 'b6e3f4',
    skinColor: 'ffdbb4',
    hairColor: '3b2f2f',
    beardColor: '3b2f2f',
    clothesColor: '4a90d9',
    picks: defaultPicks(),
    ...overrides,
  }
}

export function getPick(config, key) {
  const style = config?.style || DICE_STYLE
  const schema = schemaFor(style)
  return config?.picks?.[style]?.[key] ?? schema.defaults[key]
}

export function withPick(config, key, value) {
  const style = config?.style || DICE_STYLE
  return {
    ...config,
    picks: {
      ...(config?.picks || {}),
      [style]: { ...(config?.picks?.[style] || {}), [key]: value },
    },
  }
}

// Accepts: v2 dicebear config, v1 flat dicebear config (hairVariant…),
// legacy avatar URL strings, legacy react-nice-avatar configs.
export function normalizeAvatarConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  if (input.engine === 'dicebear' && input.picks) {
    const base = defaultDiceConfig()
    return {
      ...base, ...input,
      picks: { ...base.picks, ...(input.picks || {}) },
    }
  }
  if (input.engine === 'dicebear') {
    // v1 flat config → migrate into personas picks
    const base = defaultDiceConfig()
    const picks = { ...base.picks }
    picks.personas = {
      ...picks.personas,
      ...(input.hairVariant ? { hair: input.hairVariant } : {}),
      ...(input.eyesVariant ? { eyes: input.eyesVariant } : {}),
      ...(input.mouthVariant ? { mouth: input.mouthVariant } : {}),
      ...(input.noseVariant ? { nose: input.noseVariant } : {}),
      ...(input.facialHairVariant ? { beard: input.facialHairVariant } : {}),
      ...(input.clothesVariant ? { outfit: input.clothesVariant } : {}),
    }
    return {
      ...base,
      style: input.style || 'personas',
      seed: input.seed || base.seed,
      backgroundColor: (input.backgroundColor || base.backgroundColor),
      skinColor: input.skinColor || base.skinColor,
      hairColor: input.hairColor || base.hairColor,
      beardColor: input.facialHairColor || input.beardColor || base.beardColor,
      clothesColor: input.clothingColor || input.clothesColor || base.clothesColor,
      picks,
    }
  }
  // legacy react-nice-avatar config → closest personas look
  if (input.sex !== undefined || input.faceColor !== undefined) {
    const hex = (c) => String(c || '').replace('#', '').toLowerCase() || undefined
    const base = defaultDiceConfig()
    base.skinColor = hex(input.faceColor) || base.skinColor
    base.hairColor = hex(input.hairColor) || base.hairColor
    base.beardColor = base.hairColor
    base.clothesColor = hex(input.shirtColor) || base.clothesColor
    base.backgroundColor = hex(input.bgColor) || base.backgroundColor
    base.picks.personas = {
      ...base.picks.personas,
      hair: input.hairStyle === 'mohawk' ? 'mohawk' : input.hairStyle === 'womanLong' ? 'extraLong' : input.hairStyle === 'womanShort' ? 'bobCut' : input.hairStyle === 'thick' ? 'curly' : 'shortCombover',
      eyes: input.glassesStyle === 'round' || input.glassesStyle === 'square' ? 'glasses' : input.eyeStyle === 'smile' ? 'happy' : input.eyeStyle === 'oval' ? 'sleep' : 'open',
      mouth: input.mouthStyle === 'laugh' ? 'bigSmile' : input.mouthStyle === 'peace' ? 'smirk' : 'smile',
    }
    return base
  }
  return null
}

const cleanColor = (v) => String(v || '').replace('#', '')

export function buildDiceAvatarUrl(config) {
  const c = { ...defaultDiceConfig(), ...(config || {}) }
  const style = (c.style || DICE_STYLE).replace(/[^a-z-]/g, '') || DICE_STYLE
  const schema = schemaFor(style)
  const picks = c.picks?.[style] || schema.defaults
  const params = new URLSearchParams()
  params.set('seed', String(c.seed || 'apex'))

  if (c.backgroundColor && c.backgroundColor !== 'transparent') params.set('backgroundColor', cleanColor(c.backgroundColor))
  else params.set('backgroundColor', 'transparent')

  // ONLY params this style supports — nothing else.
  const colorMap = schema.colorParams || {}
  if (colorMap.skinColor && c.skinColor) params.set(colorMap.skinColor, cleanColor(c.skinColor))
  if (colorMap.hairColor && c.hairColor) params.set(colorMap.hairColor, cleanColor(c.hairColor))
  if (colorMap.beardColor && c.beardColor) params.set(colorMap.beardColor, cleanColor(c.beardColor))
  if (colorMap.clothesColor && c.clothesColor) params.set(colorMap.clothesColor, cleanColor(c.clothesColor))

  for (const tab of schema.variants) {
    const value = picks[tab.key] ?? schema.defaults[tab.key]
    if (tab.probabilityParam) {
      if (value === tab.noneValue) {
        params.set(tab.probabilityParam, '0')
      } else {
        params.set(tab.param, value)
        params.set(tab.probabilityParam, '100')
      }
    } else if (value) {
      params.set(tab.param, value)
    }
  }
  return `https://api.dicebear.com/${DICE_VERSION}/${style}/svg?${params.toString()}`
}

// Resolve what to render for a user: { kind:'dice', url } | { kind:'url', url } | { kind:'none' }
export function resolveUserAvatar(user) {
  const dice = normalizeAvatarConfig(user?.avatarConfig)
  if (dice) return { kind: 'dice', url: buildDiceAvatarUrl(dice), config: dice }
  if (user?.avatar) return { kind: 'url', url: user.avatar }
  return { kind: 'none' }
}
