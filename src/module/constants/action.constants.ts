/**
 * Aktionsökonomie-Konstanten. Zentrale Quelle für ActionTypes,
 * Reaktionsarten und Trigger.
 */

export const ACTION_TYPES = ["action", "bonusAction", "reaction", "freeAction"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/** Aktionstypen, die einen Slot verbrauchen. `freeAction` ist hier NICHT enthalten. */
export const SLOT_ACTION_TYPES = ["action", "bonusAction", "reaction"] as const;
export type SlotActionType = (typeof SLOT_ACTION_TYPES)[number];

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  action: "Aktion",
  bonusAction: "Bonusaktion",
  reaction: "Reaktion",
  freeAction: "Freie Aktion",
};

/** Plural-Labels für die Chat-Ausgabe „Verbleibende X". */
export const ACTION_TYPE_LABELS_PLURAL: Record<ActionType, string> = {
  action: "Aktionen",
  bonusAction: "Bonusaktionen",
  reaction: "Reaktionen",
  freeAction: "Freie Aktionen",
};

/**
 * Normalisiert alte/abgekürzte Schlüssel auf die kanonischen camelCase-Keys.
 * - "bonus" → "bonusAction"
 * - "free"  → "freeAction"
 */
export function normalizeActionType(input: string | null | undefined): ActionType {
  switch (input) {
    case "action":
    case "bonusAction":
    case "reaction":
    case "freeAction":
      return input;
    case "bonus":
      return "bonusAction";
    case "free":
      return "freeAction";
    default:
      return "action";
  }
}

// ----------------- Reaktions-Arten -----------------

export const REACTION_TYPES = [
  { key: "dodge", label: "Ausweichen" },
  { key: "reduce_damage", label: "Schaden reduzieren" },
  { key: "counter", label: "Kontern" },
  { key: "interrupt", label: "Unterbrechen" },
  { key: "protect", label: "Schützen" },
  { key: "opportunity_attack", label: "Gelegenheitsangriff" },
] as const;

export type ReactionTypeKey = (typeof REACTION_TYPES)[number]["key"];

export const REACTION_TYPE_LABELS: Record<ReactionTypeKey, string> = REACTION_TYPES.reduce(
  (acc, t) => {
    acc[t.key] = t.label;
    return acc;
  },
  {} as Record<ReactionTypeKey, string>,
);

// ----------------- Reaktions-Trigger -----------------

export const REACTION_TRIGGERS = [
  { key: "after_action_declared", label: "Nach Ankündigung einer Aktion" },
  { key: "before_attack_roll", label: "Vor Trefferwurf" },
  { key: "after_attack_roll", label: "Nach Trefferwurf" },
  { key: "before_damage_applied", label: "Vor Schadensanwendung" },
  { key: "after_damage_applied", label: "Nach Schadensanwendung" },
  { key: "on_enemy_movement", label: "Bei Gegnerbewegung" },
  { key: "on_spell_cast", label: "Bei Zauberwirkung" },
  { key: "on_ally_hit", label: "Wenn Verbündeter getroffen wird" },
] as const;

export type ReactionTriggerKey = (typeof REACTION_TRIGGERS)[number]["key"];

export const REACTION_TRIGGER_LABELS: Record<ReactionTriggerKey, string> =
  REACTION_TRIGGERS.reduce(
    (acc, t) => {
      acc[t.key] = t.label;
      return acc;
    },
    {} as Record<ReactionTriggerKey, string>,
  );
