import type { AttributeKey } from "../constants/system.constants.js";

export interface LoAAttribute {
  value: number;
  modifier: number;
}

export interface LoAResource {
  value: number;
  max: number;
}

export interface ActionEconomyData {
  actions: LoAResource;
  bonusActions: LoAResource;
  reactions: LoAResource;
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
  base: number;
  bonus: number;
  value: number;
}

export interface InventoryConfig {
  capacity: number;
}

export interface LoAActorSystemData {
  attributes: Record<AttributeKey, LoAAttribute>;
  resources: Record<string, LoAResource>;
  actionEconomy: ActionEconomyData;
  spellcasting: SpellcastingData;
  pointBuy: PointBuyData;
  ac: ArmorClassData;
  inventory: InventoryConfig;
  biography: string;
  level: number;
}
