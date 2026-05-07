import { ActionEconomyService } from "../combat/ActionEconomy.js";
import { QuickActionMenu } from "../ui/QuickActionMenu.js";
import { Logger } from "../utils/Logger.js";

/**
 * Combat-Tracker-Integration.
 *
 * Spec: „Am Anfang des EIGENEN Turns werden die Aktionsressourcen des Actors
 * zurückgesetzt." → Reset NUR per `combatTurn` (und `combatStart` für den
 * ersten aktiven Combatant), nicht pauschal pro Runde.
 *
 * Plus: Quick-Action-Menu wird automatisch beim Combat-Start geöffnet, beim Ende geschlossen,
 * und beim Wechsel des kontrollierten Tokens an den neuen Actor gebunden.
 */
export function registerCombatHooks(): void {
  Hooks.on("combatStart", onCombatStart);
  Hooks.on("combatTurn", onCombatTurn);
  Hooks.on("deleteCombat", onDeleteCombat);
  Hooks.on("controlToken", onControlToken);
}

async function onCombatStart(combat: Combat): Promise<void> {
  Logger.debug("Combat started", { round: combat.round });
  await resetActiveCombatant(combat);
  QuickActionMenu.openFor(QuickActionMenu.resolveActor());
}

async function onCombatTurn(combat: Combat): Promise<void> {
  await resetActiveCombatant(combat);
  // Wenn der GM/Spieler dem Turn folgt: Menü ggf. an den neuen aktiven Actor binden
  QuickActionMenu.rebind(QuickActionMenu.resolveActor());
}

function onDeleteCombat(): void {
  QuickActionMenu.closeIfOpen();
}

function onControlToken(_token: unknown, controlled: boolean): void {
  if (!controlled) return;
  // Token-Selektion umgeleitet: Menü auf neuen Actor umstellen, falls offen
  QuickActionMenu.rebind(QuickActionMenu.resolveActor());
}

async function resetActiveCombatant(combat: Combat): Promise<void> {
  const id = combat.current?.combatantId;
  if (!id) return;
  const combatant = combat.combatants.get(id);
  const actor = combatant?.actor;
  if (!actor) return;
  await ActionEconomyService.resetActionsForTurn(actor);
}
