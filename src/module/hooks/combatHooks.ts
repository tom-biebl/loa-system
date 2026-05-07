import { ActionEconomyService } from "../combat/ActionEconomy.js";
import { Logger } from "../utils/Logger.js";

/**
 * Combat-Tracker-Integration.
 *
 * Spec: „Am Anfang des EIGENEN Turns werden die Aktionsressourcen des Actors
 * zurückgesetzt." → Reset NUR per `combatTurn` (und `combatStart` für den
 * ersten aktiven Combatant), nicht pauschal pro Runde.
 */
export function registerCombatHooks(): void {
  Hooks.on("combatStart", onCombatStart);
  Hooks.on("combatTurn", onCombatTurn);
}

async function onCombatStart(combat: Combat): Promise<void> {
  Logger.debug("Combat started", { round: combat.round });
  await resetActiveCombatant(combat);
}

async function onCombatTurn(combat: Combat): Promise<void> {
  await resetActiveCombatant(combat);
}

async function resetActiveCombatant(combat: Combat): Promise<void> {
  const id = combat.current?.combatantId;
  if (!id) return;
  const combatant = combat.combatants.get(id);
  const actor = combatant?.actor;
  if (!actor) return;
  await ActionEconomyService.resetActionsForTurn(actor);
}
