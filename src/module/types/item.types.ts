import type { AttributeKey } from "../constants/system.constants.js";

export interface WeaponSystemData {
  description: string;
  damage: string;
  damageType: string;
  attackBonus: number;
  attribute: AttributeKey;
  range: string;
  properties: string;
}

export interface ArmorSystemData {
  description: string;
  defense: number;
  armorType: "light" | "medium" | "heavy" | "shield";
  equipped: boolean;
}

export interface SpellSystemData {
  description: string;
  resonanceCost: number;
  generatesResonance: boolean;
  level: number;
  damage: string;
  damageType: string;
  range: string;
  attribute: AttributeKey;
  isCantrip: boolean;
}

export interface AbilitySystemData {
  description: string;
  action: "action" | "bonus" | "reaction" | "free";
  cooldown: string;
}

export interface ConsumableSystemData {
  description: string;
  uses: { value: number; max: number };
  effect: string;
}

export interface EquipmentSystemData {
  description: string;
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
