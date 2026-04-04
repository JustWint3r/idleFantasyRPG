// ─────────────────────────────────────────────────────────────
//  farmConverter.ts
//  Converts farm loot drops (Item) into GearItems that can
//  be stored in the gear inventory.
// ─────────────────────────────────────────────────────────────

import type { Item } from '../types/farm.types';
import type { GearItem } from '../types/gear.types';
import { calcItemStats, calcItemCp } from './gearEngine';
import { ITEM_TEMPLATES } from '../data/gearTemplates.data';

/**
 * Convert a farm-dropped Item into a full GearItem.
 * If the templateId doesn't exist in ITEM_TEMPLATES, returns null
 * (e.g. for future item types not yet defined).
 */
export function farmItemToGearItem(item: Item): GearItem | null {
  const template = ITEM_TEMPLATES[item.templateId];
  if (!template) return null;

  return {
    id: item.id,
    templateId: item.templateId,
    rarity: item.rarity,
    level: item.level,
    equippedTo: null,
    slot: template.slot,
    stats: calcItemStats(item.templateId, item.level, item.rarity),
    cp: calcItemCp(item.templateId, item.level, item.rarity),
  };
}

/** Convert an array of farm items, filtering out any unknown templates. */
export function farmItemsToGearItems(items: Item[]): GearItem[] {
  return items.flatMap((i) => {
    const g = farmItemToGearItem(i);
    return g ? [g] : [];
  });
}
