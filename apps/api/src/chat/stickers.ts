export const FREE_STICKERS = ['heart', 'kiss', 'hug'] as const;

export function isFreeSticker(id: string): boolean {
  return (FREE_STICKERS as readonly string[]).includes(id);
}
