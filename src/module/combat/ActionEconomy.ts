import type { ActionEconomyData } from "../types/actor.types.js";
import type { ResourceCapableActor } from "../resources/ResourceManager.js";
import { ResourceManager } from "../resources/ResourceManager.js";
import type { ActionCost } from "../types/item.types.js";

export type ActionSlot = "actions" | "bonusActions" | "reactions";

const COST_TO_SLOT: Record<Exclude<ActionCost, "free">, ActionSlot> = {
  action: "actions",
  bonus: "bonusActions",
  reaction: "reactions",
};

export const ACTION_COST_LABELS: Record<ActionCost, string> = {
  action: "Aktion",
  bonus: "Bonusaktion",
  reaction: "Reaktion",
  free: "Kostenlos",
};

interface ActionEconomyActor extends ResourceCapableActor {
  id?: string | null;
}

/**
 * Verwaltet die dynamische Action Economy. Außerhalb eines aktiven Kampfes
 * werden keine Slots verbraucht — Aktionen sind dann „kostenlos".
 */
export class ActionEconomyService {
  static get(
    actor: ActionEconomyActor,
    slot: ActionSlot,
  ): { value: number; max: number } | undefined {
    const data = (actor.system.actionEconomy ?? null) as ActionEconomyData | null;
    return data?.[slot];
  }

  static async spend(
    actor: ActionEconomyActor,
    slot: ActionSlot,
    amount: number = 1,
  ): Promise<boolean> {
    const current = ActionEconomyService.get(actor, slot);
    if (!current) return false;
    if (current.value < amount) return false;
    await actor.update({
      [`system.actionEconomy.${slot}.value`]: current.value - amount,
    });
    return true;
  }

  /**
   * Verbraucht den passenden Slot zu einem Item-actionCost.
   * - `free` → immer ok, kein Verbrauch
   * - außerhalb aktiver Combat → ok, kein Verbrauch
   * - sonst → spend(slot)
   */
  static async spendForCost(
    actor: ActionEconomyActor,
    cost: ActionCost,
  ): Promise<boolean> {
    if (cost === "free") return true;
    if (!ActionEconomyService.isInActiveCombat(actor)) return true;
    const slot = COST_TO_SLOT[cost];
    return ActionEconomyService.spend(actor, slot, 1);
  }

  /** True, wenn der Actor in einem laufenden Combat steht. */
  static isInActiveCombat(actor: ActionEconomyActor): boolean {
    if (typeof game === "undefined") return false;
    const combats = game.combats?.combats ?? game.combats ?? [];
    for (const combat of combats) {
      if (!combat?.started) continue;
      const combatants = combat.combatants?.contents ?? [];
      for (const combatant of combatants) {
        if (combatant?.actor?.id === actor.id) return true;
      }
    }
    return false;
  }

  static async resetAll(actor: ActionEconomyActor): Promise<void> {
    const eco = (actor.system.actionEconomy ?? null) as ActionEconomyData | null;
    if (!eco) return;
    await actor.update({
      "system.actionEconomy.actions.value": eco.actions.max,
      "system.actionEconomy.bonusActions.value": eco.bonusActions.max,
      "system.actionEconomy.reactions.value": eco.reactions.max,
    });
  }

  static ratio(slotData: { value: number; max: number } | undefined): number {
    return ResourceManager.ratio(slotData);
  }
}
