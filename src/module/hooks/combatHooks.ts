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
  Hooks.on("updateCombat", onUpdateCombat);
  Hooks.on("deleteCombat", onDeleteCombat);
  Hooks.on("controlToken", onControlToken);
}

const LAST_RESET_KEYS = new Map<string, string>();

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

async function onUpdateCombat(
  combat: Combat,
  changed: Record<string, unknown>,
): Promise<void> {
  if (!hasTurnChange(changed)) return;
  await resetActiveCombatant(combat);
  QuickActionMenu.rebind(QuickActionMenu.resolveActor());
}

function onDeleteCombat(combat: Combat): void {
  LAST_RESET_KEYS.delete(combatKey(combat));
  QuickActionMenu.closeIfOpen();
}

function onControlToken(_token: unknown, controlled: boolean): void {
  if (!controlled) return;
  // Token-Selektion umgeleitet: Menü auf neuen Actor umstellen, falls offen
  QuickActionMenu.rebind(QuickActionMenu.resolveActor());
}

async function resetActiveCombatant(combat: Combat): Promise<void> {
  // Spec: nur ein Client soll resetten, sonst doppelte Updates oder Permission-Errors
  // bei Spielern, die nicht-eigene Actors nicht updaten dürfen.
  if (typeof game === "undefined" || !game.user?.isGM) return;
  const id = combat.current?.combatantId;
  if (!id) return;
  const combatant = combat.combatants.get(id);
  const actor = combatant?.actor;
  if (!actor) return;
  const key = combatKey(combat);
  const resetKey = `${combat.round}:${combat.turn}:${id}`;
  if (LAST_RESET_KEYS.get(key) === resetKey) return;
  LAST_RESET_KEYS.set(key, resetKey);
  await ActionEconomyService.resetActionsForTurn(actor);
}

function hasTurnChange(changed: Record<string, unknown>): boolean {
  return "round" in changed || "turn" in changed || "current" in changed;
}

function combatKey(combat: Combat): string {
  const data = combat as Combat & { id?: string | null; uuid?: string | null };
  return data.id ?? data.uuid ?? "active-combat";
}
