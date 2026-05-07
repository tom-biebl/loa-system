import type { AttributeKey } from "../constants/system.constants.js";

export type ActionCost = "action" | "bonusAction" | "reaction" | "freeAction";

/**
 * Welche Art von Wirkung das Item beim Auslösen hat.
 * - `damage`   → Schadensformel + Attack-Roll vs. Targets, Pending-Damage-Karte
 * - `heal`     → Heal-Formel, applied auf Target oder Self
 * - `utility`  → keine Würfe, nur Beschreibung als Chat-Karte
 * - `reaction` → wird NICHT direkt ausgelöst; erscheint im Pending-Damage-Dialog
 *                des Verteidigers und reduziert den eingehenden Schaden
 */
export type EffectKind = "damage" | "heal" | "utility" | "reaction";

/**
 * Wie eine Reaktion mechanisch wirkt.
 * - `flat`    → Reduktion = `reactionFormula` (numerischer Wert oder gewürfelte Formel)
 * - `rolled`  → 1d20 + Attribut vs. DC. Erfolg → Reduktion = Formel, Misserfolg → 0
 * - `counter` → 1d20 + Attribut vs. DC. Erfolg → kompletter Schaden negiert
 */
export type ReactionMode = "flat" | "rolled" | "counter";

interface BaseItemData {
  description: string;
  /** Belegte Rucksack-Slots. Nicht alle Items zählen (Spells/Abilities = 0). */
  slots: number;
}

interface ReactionFields {
  reactionMode: ReactionMode;
  reactionFormula: string;
  reactionAttribute: AttributeKey;
  /** Trigger, der diese Reaktion anbietet. Architektur-Feld, derzeit Default `before_damage_applied`. */
  reactionTrigger: string;
  /** Optional: Reaktions-Art (dodge / counter / reduce_damage / ...). */
  reactionTypeKey: string;
}

interface DefendableFields {
  /** DC, gegen die rolled/counter-Reaktionen würfeln, wenn dieses Item angreift. */
  reactionDC: number;
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

export interface SpellSystemData
  extends BaseItemData,
    ReactionFields,
    DefendableFields {
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

export interface AbilitySystemData
  extends BaseItemData,
    ReactionFields,
    DefendableFields {
  actionCost: ActionCost;
  effectKind: EffectKind;
  damage: string;
  damageType: string;
  healFormula: string;
  cooldown: string;
}

export interface ConsumableSystemData extends BaseItemData {
  uses: { value: number; max: number };
  effect: string;
  /** Stack-Größe im Inventar. Max via `InventoryService.CONSUMABLE_MAX_STACK`. */
  quantity: number;
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
