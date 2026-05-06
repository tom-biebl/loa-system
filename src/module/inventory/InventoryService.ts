import { Logger } from "../utils/Logger.js";

interface InventoryActorLike {
  id?: string | null;
  system: { inventory?: { capacity?: number } };
  items: { contents: any[] };
}

interface InventoryItemLike {
  id?: string | null;
  type: string;
  system: { slots?: number; equipped?: boolean };
}

/**
 * Slot-Buchhaltung für den Rucksack. Items, die nicht im Rucksack liegen
 * (Spells im Spellbook, gerade getragene Rüstung), zählen NICHT.
 *
 * Reine Berechnungslogik — kein Foundry-Update. Schreibende Aktionen
 * leitet das Sheet weiter an `Item.update` / `createEmbeddedDocuments`.
 */
export class InventoryService {
  static readonly DEFAULT_CAPACITY = 16;

  static capacity(actor: InventoryActorLike): number {
    return Number(actor.system.inventory?.capacity ?? InventoryService.DEFAULT_CAPACITY);
  }

  /** Items, die im Rucksack liegen (Spells exkludiert, getragene Rüstung exkludiert). */
  static backpackItems(actor: InventoryActorLike): InventoryItemLike[] {
    const list = actor.items?.contents ?? [];
    return list.filter((item: InventoryItemLike) => InventoryService.countsTowardsBackpack(item));
  }

  static countsTowardsBackpack(item: InventoryItemLike): boolean {
    if (item.type === "spell") return false;
    if (item.type === "armor" && item.system?.equipped) return false;
    return InventoryService.slotCost(item) > 0;
  }

  static slotCost(item: InventoryItemLike): number {
    return Math.max(0, Number(item.system?.slots ?? 1));
  }

  static usedSlots(actor: InventoryActorLike): number {
    return InventoryService.backpackItems(actor).reduce(
      (sum, item) => sum + InventoryService.slotCost(item),
      0,
    );
  }

  static freeSlots(actor: InventoryActorLike): number {
    return Math.max(0, InventoryService.capacity(actor) - InventoryService.usedSlots(actor));
  }

  /**
   * Prüft, ob ein eingehendes Item noch in den Rucksack passt.
   * Spells / equipped armor werden hier nicht eingerechnet.
   */
  static canAccept(actor: InventoryActorLike, item: InventoryItemLike): boolean {
    if (!InventoryService.countsTowardsBackpack(item)) return true;
    const fit = InventoryService.slotCost(item) <= InventoryService.freeSlots(actor);
    if (!fit) {
      Logger.debug("InventoryService: capacity exceeded", {
        actorId: actor.id,
        free: InventoryService.freeSlots(actor),
        need: InventoryService.slotCost(item),
      });
    }
    return fit;
  }

  static equippedArmor(actor: InventoryActorLike): InventoryItemLike | undefined {
    return (actor.items?.contents ?? []).find(
      (item: InventoryItemLike) => item.type === "armor" && Boolean(item.system?.equipped),
    );
  }
}
