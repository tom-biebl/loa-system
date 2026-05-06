import { ActionEconomyService } from "../combat/ActionEconomy.js";
import { Logger } from "../utils/Logger.js";

/**
 * Combat-Tracker Integration: setzt Aktionen / Bonusaktionen zu Beginn jedes
 * Zugs zurück und Reaktionen am Beginn jeder Runde. Engine-Logik liegt im
 * ActionEconomyService — die Hooks orchestrieren nur.
 */
export function registerCombatHooks(): void {
  Hooks.on("combatTurn", onCombatTurn);
  Hooks.on("combatRound", onCombatRound);
  Hooks.on("combatStart", onCombatStart);
}

async function onCombatStart(combat: Combat): Promise<void> {
  Logger.debug("Combat started", { round: combat.round });
  await resetReactionsForAll(combat);
}

async function onCombatTurn(combat: Combat): Promise<void> {
  const id = combat.current?.combatantId;
  if (!id) return;
  const combatant = combat.combatants.get(id);
  const actor = combatant?.actor;
  if (!actor) return;
  await ActionEconomyService.resetAll(actor);
}

async function onCombatRound(combat: Combat): Promise<void> {
  await resetReactionsForAll(combat);
}

async function resetReactionsForAll(combat: Combat): Promise<void> {
  const list = combat.combatants?.contents ?? [];
  for (const combatant of list) {
    const actor = combatant.actor;
    if (!actor?.system?.actionEconomy?.reactions) continue;
    await actor.update({
      "system.actionEconomy.reactions.value": actor.system.actionEconomy.reactions.max,
    });
  }
}
