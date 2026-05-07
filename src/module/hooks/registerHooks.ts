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
