import type { AttributeKey } from "../constants/system.constants.js";

export type ActionCost = "action" | "bonus" | "reaction" | "free";

/**
 * Welche Art von Wirkung das Item beim Auslösen hat.
 * - `damage`  → Schadensformel + Attack-Roll vs. Targets, Pending-Damage-Karte
 * - `heal`    → Heal-Formel, applied auf Target oder Self
 * - `utility` → keine Würfe, nur Beschreibung als Chat-Karte
 */
export type EffectKind = "damage" | "heal" | "utility";

interface BaseItemData {
  description: string;
  /** Belegte Rucksack-Slots. Nicht alle Items zählen (Spells/Abilities = 0). */
  slots: number;
}

export interface WeaponSystemData extends BaseItemData {
  damage: string;
  damageType: string;
  attackBonus: number;
  attribute: AttributeKey;
  range: string;
  properties: string;
  actionCost: ActionCost;
}

export interface ArmorSystemData extends BaseItemData {
  acBonus: number;
  armorType: "light" | "medium" | "heavy" | "shield";
  equipped: boolean;
}

export interface SpellSystemData extends BaseItemData {
  resonanceCost: number;
  generatesResonance: boolean;
  level: number;
  effectKind: EffectKind;
  damage: string;
  damageType: string;
  healFormula: string;
  range: string;
  attribute: AttributeKey;
  attackBonus: number;
  actionCost: ActionCost;
  isCantrip: boolean;
}

export interface AbilitySystemData extends BaseItemData {
  actionCost: ActionCost;
  effectKind: EffectKind;
  damage: string;
  damageType: string;
  healFormula: string;
  damageReduction: number;
  cooldown: string;
}

export interface ConsumableSystemData extends BaseItemData {
  uses: { value: number; max: number };
  effect: string;
}

export interface EquipmentSystemData extends BaseItemData {
  slot: string;
  equipped: boolean;
}

export type LoAItemSystemData =
  | WeaponSystemData
  | ArmorSystemData
  | SpellSystemData
  | AbilitySystemData
  | ConsumableSystemData
  | EquipmentSystemData;
