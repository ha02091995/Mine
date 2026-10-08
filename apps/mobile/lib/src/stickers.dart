const bundledStickers = ['heart', 'kiss', 'hug'];

const downloadablePacks = {
  'extra': ['spark'],
};

bool canSendSticker(String id, Set<String> ownedPacks) {
  if (bundledStickers.contains(id)) return true;
  for (final entry in downloadablePacks.entries) {
    if (entry.value.contains(id)) return ownedPacks.contains(entry.key);
  }
  return false;
}
