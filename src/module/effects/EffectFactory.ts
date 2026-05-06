/**
 * Active-Effect-Definitionen als reine Daten.
 * Neue Effekte werden hier ergänzt — ohne Sheet-/Item-Code anzufassen.
 *
 * Foundry CONST.ACTIVE_EFFECT_MODES:
 *   0 = CUSTOM, 1 = MULTIPLY, 2 = ADD, 3 = DOWNGRADE, 4 = UPGRADE, 5 = OVERRIDE
 */
export interface EffectChange {
  key: string;
  mode: number;
  value: string | number;
  priority?: number;
}

export interface EffectDefinition {
  name: string;
  icon: string;
  changes: EffectChange[];
  durationRounds?: number;
  statuses?: string[];
  description?: string;
}

const MODE_ADD = 2;
const MODE_OVERRIDE = 5;

export class EffectFactory {
  /** Resonante Überlast: -2 auf Stabilitätswürfe, 1 Runde. */
  static resonantOverload(): EffectDefinition {
    return {
      name: "Resonante Überlast",
      icon: "icons/svg/explosion.svg",
      changes: [
        { key: "system.spellcasting.bonus", mode: MODE_ADD, value: -2 },
      ],
      durationRounds: 1,
      statuses: ["loa-resonant-overload"],
      description: "Magische Belastung, -2 auf nächsten Stabilitätswurf.",
    };
  }

  static stunned(rounds: number = 1): EffectDefinition {
    return {
      name: "Betäubt",
      icon: "icons/svg/daze.svg",
      changes: [
        { key: "system.actionEconomy.actions.max", mode: MODE_OVERRIDE, value: 0 },
        { key: "system.actionEconomy.bonusActions.max", mode: MODE_OVERRIDE, value: 0 },
        { key: "system.actionEconomy.reactions.max", mode: MODE_OVERRIDE, value: 0 },
      ],
      durationRounds: rounds,
      statuses: ["loa-stunned"],
      description: "Verliert alle Aktionen für die Dauer.",
    };
  }

  static blessed(rounds: number = 3): EffectDefinition {
    return {
      name: "Gesegnet",
      icon: "icons/svg/holy-shield.svg",
      changes: [],
      durationRounds: rounds,
      statuses: ["loa-blessed"],
      description: "Vorteil auf Rettungswürfe.",
    };
  }

  /** Wandelt eine Definition in das Foundry-ActiveEffect-Datenformat. */
  static toFoundryData(def: EffectDefinition): Record<string, unknown> {
    return {
      name: def.name,
      img: def.icon,
      changes: def.changes,
      duration: def.durationRounds ? { rounds: def.durationRounds } : {},
      statuses: def.statuses ?? [],
      description: def.description ?? "",
    };
  }
}
