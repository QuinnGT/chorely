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
  { id: 'painted-hero', label: 'Painted Hero', hint: 'Most lifelike — like a fantasy game portrait' },
  { id: 'pixar', label: 'Pixar 3D', hint: 'Animated movie style, keeps facial structure' },
  { id: 'anime', label: 'Anime', hint: 'Soft anime portrait' },
  { id: 'comic', label: 'Comic Book', hint: 'Inked comic book hero' },
  { id: 'cartoon', label: 'Cartoon', hint: 'Stylized cartoon (less likeness)' },
  { id: 'sticker', label: 'Sticker', hint: 'Vinyl sticker look (least likeness)' },
  { id: 'pixel', label: 'Pixel Art', hint: 'Retro pixel art' },
  { id: 'watercolor', label: 'Watercolor', hint: 'Painted watercolor portrait' },
] as const;

export const AVATAR_QUALITIES = [
  { id: 'fast', label: 'Fast', hint: '~5s, lower fidelity' },
  { id: 'quality', label: 'Quality', hint: 'Slower, sharper' },
] as const;

export type PresetId = (typeof AVATAR_PRESETS)[number]['id'];
export type StyleId = (typeof AVATAR_STYLES)[number]['id'];
export type QualityId = (typeof AVATAR_QUALITIES)[number]['id'];

const TEXT_PRESET_DESCRIPTIONS: Record<PresetId, string> = {
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

const PHOTO_PRESET_COSTUMES: Record<PresetId, string> = {
  astronaut: 'wearing an astronaut spacesuit with a clear glass space helmet (helmet does not obscure the face)',
  pirate: 'wearing a pirate tricorn hat and a pirate coat',
  wizard: "wearing a wizard's pointed starry hat and flowing robes, holding a small glowing wand",
  robot: 'wearing playful robot-themed armor with antennas (face fully visible, not robotic)',
  superhero: 'wearing a superhero costume with a small domino mask and a cape (mask does not cover the eyes much)',
  'dragon-rider': 'in adventurer leather gear with a small friendly dragon perched on their shoulder',
  mermaid: 'wearing sparkly mermaid-themed clothing with shell and pearl accessories, ocean background',
  knight: 'wearing polished silver knight armor and holding a small heraldic shield',
  ninja: 'wearing colorful ninja gear with a headband (face fully visible, no mask covering the face)',
  dinosaur: 'wearing a cute hooded dinosaur onesie costume',
};

const TEXT_STYLE_DESCRIPTIONS: Record<StyleId, string> = {
  'painted-hero':
    'polished painted fantasy hero portrait, semi-realistic, cinematic warm lighting, painterly brushwork, simple background',
  pixar:
    'Pixar-style 3D animated character portrait, soft volumetric lighting, expressive eyes, simple background',
  anime: 'soft modern anime portrait, clean linework, large expressive eyes, simple background',
  comic:
    'inked comic book hero illustration, dynamic cel-shaded coloring, simple background',
  cartoon: 'bright cartoon style, bold outlines, vibrant colors, simple background',
  sticker: 'vinyl sticker design, thick white outline, flat colors, plain background',
  pixel: '8-bit pixel art style, retro game character, plain background',
  watercolor: 'soft watercolor painting style, gentle pastels, paper texture',
};

const PHOTO_STYLE_DESCRIPTIONS: Record<StyleId, string> = {
  'painted-hero':
    'a polished painted fantasy hero portrait — semi-realistic painterly brushwork, cinematic warm lighting, rich detail',
  pixar:
    'a Pixar-style 3D animated character — soft volumetric lighting, expressive eyes, smooth shading',
  anime:
    'a soft modern anime portrait — clean linework, expressive eyes, gentle shading',
  comic:
    'an inked comic-book hero illustration — dynamic cel-shaded coloring, clean ink lines',
  cartoon: 'a friendly cartoon portrait — soft shading, light outlines',
  sticker: 'a vinyl sticker portrait — thick white outline, flat colors',
  pixel: '32-bit pixel art portrait — retro game character',
  watercolor:
    'a soft watercolor painted portrait — gentle pastel brushwork, paper texture',
};

const APPEARANCE_DIRECTIVE =
  'Keep the same hairstyle, hair color, eye color, skin tone, and approximate age that appear in the reference image — the avatar should feel like the same young adventurer in a new outfit and art style.';

export function buildAvatarPrompt(preset: PresetId, style: StyleId): string {
  return `A cute, kid-appropriate portrait avatar of ${TEXT_PRESET_DESCRIPTIONS[preset]}. ${TEXT_STYLE_DESCRIPTIONS[style]}. Square composition, centered subject, smiling, family-friendly.`;
}

export function buildAvatarFromPhotoPrompt(preset: PresetId, style: StyleId): string {
  return [
    'Using the attached photo as a reference, illustrate a fun stylized portrait avatar of the young adventurer shown.',
    APPEARANCE_DIRECTIVE,
    `Dress them ${PHOTO_PRESET_COSTUMES[preset]}.`,
    `Illustrate the avatar as ${PHOTO_STYLE_DESCRIPTIONS[style]}.`,
    'Square head-and-shoulders composition, centered, smiling, friendly, family-friendly.',
    'Do not include any text, logos, watermarks, or signatures.',
  ].join(' ');
}

export function isValidPreset(id: string): id is PresetId {
  return AVATAR_PRESETS.some((p) => p.id === id);
}

export function isValidStyle(id: string): id is StyleId {
  return AVATAR_STYLES.some((s) => s.id === id);
}

export function isValidQuality(id: string): id is QualityId {
  return AVATAR_QUALITIES.some((q) => q.id === id);
}
