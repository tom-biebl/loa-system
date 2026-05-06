export const SYSTEM_ID = "loa-system";
export const SYSTEM_LABEL = "LoA System";

export const ATTRIBUTE_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  str: "Stärke",
  dex: "Geschicklichkeit",
  con: "Konstitution",
  int: "Intelligenz",
  wis: "Weisheit",
  cha: "Charisma",
};

export const SPELLCASTING_ATTRIBUTES: AttributeKey[] = ["int", "wis", "cha"];

export const ITEM_TYPES = [
  "weapon",
  "armor",
  "spell",
  "ability",
  "consumable",
  "equipment",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const ACTOR_TYPES = ["character", "npc"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const RESONANCE_THRESHOLDS = [5, 10, 15, 20] as const;
