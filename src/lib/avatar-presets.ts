export const AVATAR_PRESETS = [
  { id: 'astronaut', label: 'Astronaut', emoji: '🚀' },
  { id: 'pirate', label: 'Pirate', emoji: '🏴‍☠️' },
  { id: 'wizard', label: 'Wizard', emoji: '🧙' },
  { id: 'robot', label: 'Robot', emoji: '🤖' },
  { id: 'superhero', label: 'Superhero', emoji: '🦸' },
  { id: 'dragon-rider', label: 'Dragon Rider', emoji: '🐉' },
  { id: 'mermaid', label: 'Mermaid', emoji: '🧜' },
  { id: 'knight', label: 'Knight', emoji: '⚔️' },
  { id: 'ninja', label: 'Ninja', emoji: '🥷' },
  { id: 'dinosaur', label: 'Dinosaur', emoji: '🦖' },
] as const;

export const AVATAR_STYLES = [
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'sticker', label: 'Sticker' },
  { id: 'pixel', label: 'Pixel Art' },
  { id: 'watercolor', label: 'Watercolor' },
] as const;

export type PresetId = (typeof AVATAR_PRESETS)[number]['id'];
export type StyleId = (typeof AVATAR_STYLES)[number]['id'];

const PRESET_DESCRIPTIONS: Record<PresetId, string> = {
  astronaut: 'a brave young astronaut in a space helmet',
  pirate: 'a cheerful young pirate with a tricorn hat',
  wizard: 'a young wizard with a pointed hat holding a tiny wand',
  robot: 'a cute friendly robot with big eyes and antennas',
  superhero: 'a brave young superhero wearing a mask and cape',
  'dragon-rider': 'a young hero riding a small friendly dragon',
  mermaid: 'a young mermaid with a sparkly tail',
  knight: 'a young knight in shiny armor holding a small shield',
  ninja: 'a young ninja in colorful gear with a friendly smile',
  dinosaur: 'a cute small cartoon dinosaur character',
};

const STYLE_DESCRIPTIONS: Record<StyleId, string> = {
  cartoon: 'bright cartoon style, bold outlines, vibrant colors, simple background',
  sticker: 'vinyl sticker design, thick white outline, flat colors, plain background',
  pixel: '8-bit pixel art style, retro game character, plain background',
  watercolor: 'soft watercolor painting style, gentle pastels, paper texture',
};

export function buildAvatarPrompt(preset: PresetId, style: StyleId): string {
  return `A cute, kid-appropriate portrait avatar of ${PRESET_DESCRIPTIONS[preset]}. ${STYLE_DESCRIPTIONS[style]}. Square composition, centered subject, smiling, family-friendly.`;
}

export function isValidPreset(id: string): id is PresetId {
  return AVATAR_PRESETS.some((p) => p.id === id);
}

export function isValidStyle(id: string): id is StyleId {
  return AVATAR_STYLES.some((s) => s.id === id);
}
