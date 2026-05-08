import { SYSTEM_ID, SYSTEM_LABEL } from "../constants/system.constants.js";
import { LoAActor } from "../actors/LoAActor.js";
import { LoAActorSheet } from "../actors/LoAActorSheet.js";
import { LoAItem } from "../items/LoAItem.js";
import { LoAItemSheet } from "../items/LoAItemSheet.js";
import { TemplatePreloader } from "../templates/TemplatePreloader.js";
import { Logger } from "../utils/Logger.js";
import { InitiativeService } from "../combat/InitiativeService.js";
import { WildMagicTableInstaller } from "../magic/WildMagicTableInstaller.js";
import { registerCombatHooks } from "./combatHooks.js";
import { registerChatHooks } from "./chatHooks.js";
import { GMBridgeService } from "../network/GMBridgeService.js";
import { registerGMBridgeHandlers } from "../network/registerGMBridgeHandlers.js";
import { QuickActionMenu } from "../ui/QuickActionMenu.js";

/**
 * Zentrale Hook-Registrierung. Andere Module sollen NICHT direkt
 * Hooks an Foundry binden — alles geht über diesen Einstieg.
 */
export function registerHooks(): void {
  Hooks.once("init", onInit);
  Hooks.once("ready", onReady);
  registerCombatHooks();
  registerChatHooks();
}

function onInit(): void {
  Logger.info(`${SYSTEM_LABEL} | initializing`);

  CONFIG.Actor.documentClass = LoAActor;
  CONFIG.Item.documentClass = LoAItem;

  InitiativeService.configure();
  registerQuickMenuKeybinding();

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet(SYSTEM_ID, LoAActorSheet, {
    types: ["character", "npc"],
    makeDefault: true,
    label: `${SYSTEM_LABEL} Actor Sheet`,
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet(SYSTEM_ID, LoAItemSheet, {
    types: ["weapon", "armor", "spell", "ability", "consumable", "equipment"],
    makeDefault: true,
    label: `${SYSTEM_LABEL} Item Sheet`,
  });

  void TemplatePreloader.preload();
}

async function onReady(): Promise<void> {
  Logger.info(`${SYSTEM_LABEL} | ready`);
  registerGMBridgeHandlers();
  GMBridgeService.register();
  await WildMagicTableInstaller.ensure();
}

/**
 * Registriert die Standard-Tastenbelegung zum Toggeln des Quick-Action-Menus.
 * Default: Ctrl+Q. Spieler dürfen das Keybinding nutzen (`restricted: false`).
 */
function registerQuickMenuKeybinding(): void {
  if (typeof game === "undefined") return;
  if (typeof game.keybindings?.register !== "function") return;
  game.keybindings.register(SYSTEM_ID, "toggle-quick-menu", {
    name: "Quick-Action-Menü umschalten",
    hint: "Öffnet bzw. schließt das Quick-Action-Menü für den aktuell kontrollierten Actor.",
    editable: [{ key: "KeyQ", modifiers: ["Control"] }],
    onDown: () => {
      QuickActionMenu.toggle();
      return true;
    },
    restricted: false,
  });
}
