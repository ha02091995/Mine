export const FREE_STICKERS = ['heart', 'kiss', 'hug'] as const;

export const EXTRA_PACKS: Record<string, readonly string[]> = {
  extra: ['spark'],
};

export function isFreeSticker(id: string): boolean {
  return (FREE_STICKERS as readonly string[]).includes(id);
}

export function packForSticker(id: string): string | null {
  for (const [packId, stickers] of Object.entries(EXTRA_PACKS)) {
    if (stickers.includes(id)) return packId;
  }
  return null;
}
