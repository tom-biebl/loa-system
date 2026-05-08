import { Logger } from "../utils/Logger.js";
import { ChatCardRenderer } from "../chat/ChatCardRenderer.js";
import { DamageService } from "../combat/DamageService.js";
import { ReactionService } from "../combat/ReactionService.js";
import { AoEService } from "../combat/AoEService.js";
import { TargetService } from "../combat/TargetService.js";
import { EffectManager } from "../effects/EffectManager.js";
import { RollManager } from "../rolls/RollManager.js";

interface InventoryActorLike {
  id?: string | null;
  name?: string;
  system: { inventory?: { capacity?: number } };
  items: { contents: any[] };
  createEmbeddedDocuments?(type: string, data: unknown[]): Promise<unknown[]>;
}

interface InventoryItemLike {
  id?: string | null;
  name?: string;
  type: string;
  system: { slots?: number; equipped?: boolean; quantity?: number };
}

interface StackResult {
  /** Wurde Teil des Stapels in vorhandene Items eingegliedert? */
  handled: boolean;
  /** Anzahl, die noch übrig ist und als neues Item erzeugt werden muss. */
  remainder: number;
}

/**
 * Slot-Buchhaltung für den Rucksack. Spells / equipped armor zählen NICHT.
 * Consumables sind stackbar bis `CONSUMABLE_MAX_STACK` und belegen pro Stack 1 Slot.
 */
export class InventoryService {
  static readonly DEFAULT_CAPACITY = 16;
  static readonly CONSUMABLE_MAX_STACK = 10;

  static capacity(actor: InventoryActorLike): number {
    return Number(actor.system.inventory?.capacity ?? InventoryService.DEFAULT_CAPACITY);
  }

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

  /**
   * Stapelt ein eingehendes Consumable auf bestehende gleichnamige Stacks.
   * Liefert den Restbestand zurück, der noch in einen NEUEN Slot muss.
   */
  static async stackConsumable(
    actor: InventoryActorLike,
    incoming: InventoryItemLike,
  ): Promise<StackResult> {
    if (incoming.type !== "consumable") {
      return { handled: false, remainder: Number(incoming.system?.quantity ?? 1) };
    }
    let remaining = Math.max(1, Number(incoming.system?.quantity ?? 1));
    const matches = (actor.items?.contents ?? []).filter(
      (i: any) =>
        i.type === "consumable" &&
        i.name === incoming.name &&
        Number(i.system?.quantity ?? 1) < InventoryService.CONSUMABLE_MAX_STACK,
    );
    if (matches.length === 0) return { handled: false, remainder: remaining };

    let handled = false;
    for (const match of matches) {
      if (remaining <= 0) break;
      const current = Number(match.system?.quantity ?? 1);
      const space = InventoryService.CONSUMABLE_MAX_STACK - current;
      if (space <= 0) continue;
      const toAdd = Math.min(remaining, space);
      await match.update({ "system.quantity": current + toAdd });
      remaining -= toAdd;
      handled = true;
    }
    return { handled, remainder: remaining };
  }

  /**
   * Verbraucht eines aus einem Consumable-Stack:
   *   1. AoE-Placement (falls aktiviert) → Targets gesetzt
   *   2. Heilung (self) ODER Schaden auf alle Targets als Pending-Damage
   *   3. Status-Effekt auf alle AoE-Targets (z.B. Rauchbombe → Invisible)
   *   4. Chat-Karte + Quantity dekrementieren
   *
   * Bricht der User das AoE-Placement ab, wird NICHTS verbraucht.
   */
  static async consumeOne(
    actor: InventoryActorLike,
    item: InventoryItemLike & { delete(): Promise<unknown>; update(diff: Record<string, unknown>): Promise<unknown>; img?: string },
  ): Promise<void> {
    if (item.type !== "consumable") return;
    const sys = item.system as Partial<{
      quantity: number;
      effect: string;
      description: string;
      healFormula: string;
      damage: string;
      damageType: string;
      appliedStatus: string;
      aoe: { enabled?: boolean };
    }>;
    const speaker = ChatMessage.getSpeaker({ actor });
    const healFormula = String(sys?.healFormula ?? "").trim();
    const damageFormula = String(sys?.damage ?? "").trim();
    const damageType = String(sys?.damageType ?? "physical");
    const appliedStatus = String(sys?.appliedStatus ?? "").trim();
    const aoeEnabled = Boolean(sys?.aoe?.enabled);

    // 1. AoE-Placement (falls aktiviert)
    if (aoeEnabled) {
      const result = await AoEService.placeAndCollect((sys as { aoe?: any })?.aoe);
      if (!result) return; // Abbruch — kein Verbrauch
    }

    // 2a. Heilung (Self-Drink, ohne AoE)
    if (healFormula && !aoeEnabled) {
      try {
        const roll = await RollManager.roll({
          formula: healFormula,
          flavor: `${item.name ?? "Consumable"} · Heilung`,
          speaker,
        });
        await DamageService.heal(actor as any, Number(roll.total ?? 0));
      } catch (error) {
        Logger.warn("Consumable healing formula failed", {
          item: item.name,
          healFormula,
          error,
        });
        ui.notifications?.warn("Heilungs-Formel konnte nicht gewürfelt werden.");
        return;
      }
    }

    // 2b. Schaden auf AoE-Targets (oder ein gewähltes Single-Target)
    if (damageFormula) {
      const targets = TargetService.getActors();
      try {
        const damageRoll = await RollManager.roll({
          formula: damageFormula,
          flavor: `${item.name ?? "Consumable"} · Schaden (${damageType})`,
          speaker,
        });
        const dmg = Number(damageRoll.total ?? 0);
        if (targets.length === 0) {
          Logger.debug("Consumable: Schadensformel ohne Targets — nur Anzeige.");
        }
        for (const target of targets) {
          await ReactionService.createPending({
            attackerName: actor.name ?? "Unbekannt",
            targetActor: target,
            damage: dmg,
            damageType,
            source: item.name ?? "Consumable",
            dc: null,
          });
        }
      } catch (error) {
        Logger.warn("Consumable damage formula failed", {
          item: item.name,
          damageFormula,
          error,
        });
      }
    }

    // 3. Status-Effekt auf alle AoE-Targets (z.B. Invisible)
    if (appliedStatus && aoeEnabled) {
      const targets = TargetService.getActors();
      for (const target of targets) {
        await EffectManager.applyStatus(target, appliedStatus, true);
      }
    }

    // 4. Utility-Chat-Karte falls weder Heal noch Damage
    if (!healFormula && !damageFormula) {
      const description =
        sys?.effect?.trim() ||
        sys?.description?.trim() ||
        `${item.name ?? "Consumable"} verwendet.`;
      await ChatCardRenderer.renderUtility({
        speaker,
        actorName: actor.name ?? "",
        itemName: item.name ?? "Consumable",
        itemImg: item.img,
        description,
      });
    }

    await InventoryService.decrementConsumable(item, Number(sys?.quantity ?? 1));
  }

  private static async decrementConsumable(
    item: { delete(): Promise<unknown>; update(diff: Record<string, unknown>): Promise<unknown> },
    qty: number,
  ): Promise<void> {
    if (qty <= 1) {
      await item.delete();
    } else {
      await item.update({ "system.quantity": qty - 1 });
    }
  }
}
