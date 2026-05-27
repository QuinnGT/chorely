export type StoreItemCategory = 'toys' | 'games' | 'experiences' | 'books';

export interface StoreItemPromptInput {
  name: string;
  description?: string;
  category?: StoreItemCategory;
}

const CATEGORY_PROMPTS: Record<
  StoreItemCategory,
  (subject: string, detail: string | undefined) => string
> = {
  toys: (subject, detail) =>
    [
      `Studio product photograph of ${subject}.`,
      detail ? `${detail}.` : '',
      'Soft natural lighting, neutral seamless background, centered subject, sharp focus, e-commerce listing style. Photorealistic. Family-friendly, no text or logos.',
    ]
      .filter(Boolean)
      .join(' '),

  games: (subject, detail) =>
    [
      `Studio product photograph of the game "${subject}", showing the box front.`,
      detail ? `${detail}.` : '',
      'Clean white background, soft studio lighting, slight three-quarter angle, sharp focus, e-commerce listing style. Photorealistic. Family-friendly, no real brand logos.',
    ]
      .filter(Boolean)
      .join(' '),

  books: (subject, detail) =>
    [
      `Front cover photograph of the children's book "${subject}".`,
      detail ? `${detail}.` : '',
      'Straight-on view, hardcover, clean white background, soft studio lighting, sharp focus, e-commerce listing style. Photorealistic. Family-friendly.',
    ]
      .filter(Boolean)
      .join(' '),

  experiences: (subject, detail) =>
    [
      `Cheerful illustrated postcard scene depicting ${subject}.`,
      detail ? `${detail}.` : '',
      'Bright vibrant colors, soft shapes, warm lighting, family-friendly storybook style. No text, no real brand logos. Square composition.',
    ]
      .filter(Boolean)
      .join(' '),
};

const DEFAULT_PROMPT = (subject: string, detail: string | undefined): string =>
  [
    `Studio product photograph of ${subject}.`,
    detail ? `${detail}.` : '',
    'Soft natural lighting, neutral background, centered subject, sharp focus, e-commerce listing style. Photorealistic. Family-friendly, no text or logos.',
  ]
    .filter(Boolean)
    .join(' ');

export function buildStoreItemPrompt({
  name,
  description,
  category,
}: StoreItemPromptInput): string {
  const subject = name.trim();
  const detail = description?.trim() || undefined;
  const builder = category ? CATEGORY_PROMPTS[category] : DEFAULT_PROMPT;
  return builder(subject, detail);
}
