import { SYSTEM_ID } from "./system.constants.js";

const ROOT = `systems/${SYSTEM_ID}`;

export const TEMPLATE_PATHS = {
  actorCharacter: `${ROOT}/templates/actor/character-sheet.hbs`,
  actorNpc: `${ROOT}/templates/actor/npc-sheet.hbs`,
  itemGeneric: `${ROOT}/templates/item/item-sheet.hbs`,
  itemWeapon: `${ROOT}/templates/item/weapon-sheet.hbs`,
  itemSpell: `${ROOT}/templates/item/spell-sheet.hbs`,
  itemArmor: `${ROOT}/templates/item/armor-sheet.hbs`,
  itemAbility: `${ROOT}/templates/item/ability-sheet.hbs`,
  itemConsumable: `${ROOT}/templates/item/consumable-sheet.hbs`,
  quickActionMenu: `${ROOT}/templates/apps/quick-action-menu.hbs`,
  chatAttack: `${ROOT}/templates/chat/attack-result.hbs`,
  chatRoll: `${ROOT}/templates/chat/roll-result.hbs`,
} as const;
