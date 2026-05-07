import type { AttributeKey } from "../constants/system.constants.js";
import type { ExperienceEntry } from "../experience/ExperienceService.js";

export interface LoAAttribute {
  value: number;
  modifier: number;
}

export interface LoAResource {
  value: number;
  max: number;
}

export interface SuperiorityDiceResource {
  dice: string;
  current: number;
  max: number;
}

export interface AmmoResource {
  arrows: number;
  bolts: number;
}

export interface SpecialAmmoEntry {
  type: string;
  label: string;
  amount: number;
}

export interface PotionInventory {
  slots: number;
  items: unknown[];
}

/**
 * @deprecated Alte Aktionsökonomie. Wird durch `combat.actions` ersetzt.
 * Bleibt nur für Backward-Reads, wird beim Spend nicht mehr beschrieben.
 */
export interface ActionEconomyData {
  actions: LoAResource;
  bonusActions: LoAResource;
  reactions: LoAResource;
}

export interface ActionResource {
  current: number;
  max: number;
}

export interface CombatActionsData {
  action: ActionResource;
  bonusAction: ActionResource;
  reaction: ActionResource;
}

export interface CombatData {
  actions: CombatActionsData;
}

export interface SpellcastingData {
  ability: AttributeKey;
}

export interface PointBuyData {
  total: number;
  spent: number;
  remaining: number;
}

export interface ArmorClassData {
  bonus: number;
  value: number;
}

export interface InventoryConfig {
  capacity: number;
}

export interface ClassRefData {
  key: string;
  subclass: string | null;
}

/**
 * Actor-Resourcen. `hp` und `resonance` sind LoAResource ({value,max}).
 * Klassen-spezifische Ressourcen haben eigene Shapes.
 */
export interface LoAResources {
  hp: LoAResource;
  resonance: LoAResource;
  superiorityDice?: SuperiorityDiceResource;
  ammo?: AmmoResource;
  specialAmmo?: SpecialAmmoEntry[];
  [key: string]: unknown;
}

export interface LoAClassResources {
  potions: PotionInventory;
}

export interface LoAActorSystemData {
  attributes: Record<AttributeKey, LoAAttribute>;
  resources: LoAResources;
  classResources: LoAClassResources;
  combat: CombatData;
  /** @deprecated — Daten bleiben evtl. auf alten Actors, werden aber nicht mehr genutzt. */
  actionEconomy?: ActionEconomyData;
  spellcasting: SpellcastingData;
  pointBuy: PointBuyData;
  ac: ArmorClassData;
  inventory: InventoryConfig;
  class: ClassRefData;
  experience: ExperienceEntry[];
  biography: string;
  level: number;
}
