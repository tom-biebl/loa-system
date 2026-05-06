import type { ActionEconomyData } from "../types/actor.types.js";
import type { ResourceCapableActor } from "../resources/ResourceManager.js";
import { ResourceManager } from "../resources/ResourceManager.js";

export type ActionSlot = "actions" | "bonusActions" | "reactions";

/**
 * Verwaltet die dynamische Action Economy. Bossgegner / Buffs / Debuffs können `max`
 * abweichend setzen — der Service trifft keine harten Annahmen über Slot-Anzahl.
 *
 * Reuse: Stützt sich auf den ResourceManager, indem die Slots als Resourcen-ähnliche
 * Felder direkt adressiert werden.
 */
export class ActionEconomyService {
  static get(
    actor: ResourceCapableActor,
    slot: ActionSlot,
  ): { value: number; max: number } | undefined {
    const data = (actor.system.actionEconomy ?? null) as ActionEconomyData | null;
    return data?.[slot];
  }

  static async spend(
    actor: ResourceCapableActor,
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

  static async resetAll(actor: ResourceCapableActor): Promise<void> {
    const eco = (actor.system.actionEconomy ?? null) as ActionEconomyData | null;
    if (!eco) return;
    await actor.update({
      "system.actionEconomy.actions.value": eco.actions.max,
      "system.actionEconomy.bonusActions.value": eco.bonusActions.max,
      "system.actionEconomy.reactions.value": eco.reactions.max,
    });
  }

  /** Hilfshilfe für Sheets, um Action-Pills anzuzeigen. */
  static ratio(slotData: { value: number; max: number } | undefined): number {
    return ResourceManager.ratio(slotData);
  }
}
