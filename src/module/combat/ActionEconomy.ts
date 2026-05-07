import type { ActionResource, CombatActionsData } from "../types/actor.types.js";
import type { ResourceCapableActor } from "../resources/ResourceManager.js";
import {
  ACTION_TYPE_LABELS,
  ACTION_TYPE_LABELS_PLURAL,
  SLOT_ACTION_TYPES,
  normalizeActionType,
  type ActionType,
  type SlotActionType,
} from "../constants/action.constants.js";
import { ChatCardRenderer } from "../chat/ChatCardRenderer.js";
import { Logger } from "../utils/Logger.js";

/** Backwards-compat alias — Code, der noch `ActionSlot` benutzt, läuft weiter. */
export type ActionSlot = SlotActionType;

export const ACTION_COST_LABELS = ACTION_TYPE_LABELS;

interface ActionEconomyActor extends ResourceCapableActor {
  id?: string | null;
  name?: string;
}

interface SpendOptions {
  /** Kontext für die Chat-Nachricht (z.B. Item-Name). */
  description?: string;
  /** Setzt true, wenn keine Chat-Karte gewünscht ist. */
  silent?: boolean;
  /** Bypass für `isInActiveCombat`-Check (z.B. manuelle Buttons). */
  enforce?: boolean;
}

/**
 * Zentrale Aktionsökonomie nach Spec `combat-action-economy.md`.
 *
 * - Pfad: `system.combat.actions.{action,bonusAction,reaction}.{current,max}`
 * - `spendAction(actor, type)` ist der einzig erlaubte Verbrauchspfad
 * - `resetActionsForTurn(actor)` setzt alle drei Slots auf max
 * - Bounds: 0 ≤ current ≤ max werden bei jedem Update geclampt
 * - Chat-Ausgabe nach jedem Spend (außer `silent` / `freeAction`)
 */
export class ActionEconomyService {
  // ----------------- Reads -----------------

  static get(
    actor: ActionEconomyActor,
    type: SlotActionType,
  ): ActionResource | undefined {
    const data = (actor.system as { combat?: { actions?: CombatActionsData } })
      .combat?.actions;
    return data?.[type];
  }

  /** Snapshot aller drei Slots (oder Default). */
  static snapshot(actor: ActionEconomyActor): CombatActionsData {
    const fallback: ActionResource = { current: 0, max: 0 };
    return {
      action: ActionEconomyService.get(actor, "action") ?? fallback,
      bonusAction: ActionEconomyService.get(actor, "bonusAction") ?? fallback,
      reaction: ActionEconomyService.get(actor, "reaction") ?? fallback,
    };
  }

  // ----------------- Spend -----------------

  /**
   * Verbraucht eine Aktion (Aktion / Bonusaktion / Reaktion).
   * Free Actions verbrauchen NICHTS, geben aber optional eine Chat-Karte.
   *
   * @returns true, wenn der Verbrauch durchging
   */
  static async spendAction(
    actor: ActionEconomyActor,
    type: ActionType | string | null | undefined,
    options: SpendOptions = {},
  ): Promise<boolean> {
    const normalized = normalizeActionType(type ?? "action");

    if (normalized === "freeAction") {
      if (!options.silent) {
        await ActionEconomyService.postChat(actor, normalized, options.description, 0, 0, true);
      }
      return true;
    }

    if (!options.enforce && !ActionEconomyService.isInActiveCombat(actor)) {
      // Außerhalb eines Kampfs werden Slots nicht verbraucht (Spec-konform: keine Reset-Logik außer Combat).
      if (!options.silent) {
        const data = ActionEconomyService.get(actor, normalized) ?? { current: 0, max: 0 };
        await ActionEconomyService.postChat(
          actor,
          normalized,
          options.description,
          data.current,
          data.max,
        );
      }
      return true;
    }

    const slot = ActionEconomyService.get(actor, normalized);
    if (!slot) {
      Logger.warn("Unknown action slot", { actorId: actor.id, type: normalized });
      return false;
    }
    if (slot.current <= 0) {
      ui.notifications?.warn(
        `Keine ${ACTION_TYPE_LABELS_PLURAL[normalized]} mehr in dieser Runde übrig.`,
      );
      return false;
    }

    const next = ActionEconomyService.clamp(slot.current - 1, slot.max);
    await actor.update({
      [`system.combat.actions.${normalized}.current`]: next,
    });

    if (!options.silent) {
      await ActionEconomyService.postChat(
        actor,
        normalized,
        options.description,
        next,
        slot.max,
      );
    }
    return true;
  }

  // ----------------- Reset -----------------

  /** Alle drei Slots des Actors auf `max` setzen. Entspricht „Turn-Start-Reset". */
  static async resetActionsForTurn(actor: ActionEconomyActor): Promise<void> {
    const data = ActionEconomyService.snapshot(actor);
    await actor.update({
      "system.combat.actions.action.current": data.action.max,
      "system.combat.actions.bonusAction.current": data.bonusAction.max,
      "system.combat.actions.reaction.current": data.reaction.max,
    });
  }

  /** Alias für API-Kontinuität (alte Aufrufe in der Codebasis). */
  static async resetAll(actor: ActionEconomyActor): Promise<void> {
    return ActionEconomyService.resetActionsForTurn(actor);
  }

  // ----------------- Manuelle Setter -----------------

  static async setCurrent(
    actor: ActionEconomyActor,
    type: SlotActionType,
    raw: number,
  ): Promise<void> {
    const slot = ActionEconomyService.get(actor, type);
    if (!slot) return;
    const value = ActionEconomyService.clamp(raw, slot.max);
    await actor.update({
      [`system.combat.actions.${type}.current`]: value,
    });
  }

  static async setMax(
    actor: ActionEconomyActor,
    type: SlotActionType,
    rawMax: number,
  ): Promise<void> {
    const slot = ActionEconomyService.get(actor, type);
    if (!slot) return;
    const max = Math.max(0, Math.floor(Number(rawMax) || 0));
    const current = Math.min(slot.current, max);
    await actor.update({
      [`system.combat.actions.${type}.max`]: max,
      [`system.combat.actions.${type}.current`]: current,
    });
  }

  // ----------------- Backward Compat -----------------

  /**
   * @deprecated Behält die alte API für Aufrufer in der Codebasis am Leben.
   * Intern delegiert sie an `spendAction`.
   */
  static async spend(
    actor: ActionEconomyActor,
    slot: ActionSlot,
    amount: number = 1,
  ): Promise<boolean> {
    if (amount <= 0) return true;
    let ok = true;
    for (let i = 0; i < amount; i += 1) {
      ok = (await ActionEconomyService.spendAction(actor, slot, { silent: true })) && ok;
      if (!ok) break;
    }
    return ok;
  }

  /** @deprecated → `spendAction` mit description. */
  static async spendForCost(
    actor: ActionEconomyActor,
    cost: string,
    description?: string,
  ): Promise<boolean> {
    return ActionEconomyService.spendAction(actor, cost, { description });
  }

  // ----------------- Combat-Kontext -----------------

  /** True, wenn der Actor in einem laufenden Combat steht. */
  static isInActiveCombat(actor: ActionEconomyActor): boolean {
    if (typeof game === "undefined") return false;
    const collection = game.combats;
    if (!collection) return false;
    const combats: any[] = Array.isArray(collection)
      ? collection
      : Array.isArray(collection.contents)
      ? collection.contents
      : Array.from(collection as Iterable<any>);
    for (const combat of combats) {
      if (!combat?.started) continue;
      const combatantsRaw = combat.combatants;
      if (!combatantsRaw) continue;
      const combatants: any[] = Array.isArray(combatantsRaw.contents)
        ? combatantsRaw.contents
        : Array.from(combatantsRaw as Iterable<any>);
      for (const combatant of combatants) {
        if (combatant?.actor?.id === actor.id) return true;
      }
    }
    return false;
  }

  static ratio(slotData: ActionResource | undefined): number {
    if (!slotData || slotData.max <= 0) return 0;
    return Math.max(0, Math.min(1, slotData.current / slotData.max));
  }

  /** Gibt die für das Sheet benötigten Slot-Keys zurück. */
  static slotKeys(): readonly SlotActionType[] {
    return SLOT_ACTION_TYPES;
  }

  // ----------------- Helpers -----------------

  private static clamp(value: number, max: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(Math.floor(value), Math.max(0, Math.floor(max))));
  }

  private static async postChat(
    actor: ActionEconomyActor,
    type: ActionType,
    description: string | undefined,
    current: number,
    max: number,
    isFree: boolean = false,
  ): Promise<void> {
    if (typeof ChatMessage === "undefined") return;
    try {
      await ChatCardRenderer.renderActionSpend({
        speaker: ChatMessage.getSpeaker({ actor }),
        actorName: actor.name ?? "Unbekannt",
        actionLabel: ACTION_TYPE_LABELS[type],
        pluralLabel: ACTION_TYPE_LABELS_PLURAL[type],
        description,
        current,
        max,
      });
      if (isFree) Logger.debug("Free action spent", { actorId: actor.id, description });
    } catch (error) {
      Logger.warn("Action spend chat failed", error);
    }
  }
}
