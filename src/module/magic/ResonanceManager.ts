import type { ResonanceCheckResult } from "../types/roll.types.js";
import { Logger } from "../utils/Logger.js";
import type { ResourceCapableActor } from "../resources/ResourceManager.js";
import { ResourceManager } from "../resources/ResourceManager.js";

interface ThresholdRule {
  threshold: number;
  damageBonus: string | null;
  flatDamageBonus: number | null;
  rangeBonus: number;
  dc: number | null;
}

/**
 * Datengetriebene Resonanz-Schwellen statt verstreuter if/else-Logik.
 * Erweiterbar um neue Stufen, ohne anderen Code anzufassen.
 */
const THRESHOLD_RULES: ThresholdRule[] = [
  { threshold: 5, damageBonus: "1d4", flatDamageBonus: null, rangeBonus: 5, dc: null },
  { threshold: 10, damageBonus: "1d6", flatDamageBonus: null, rangeBonus: 10, dc: 10 },
  { threshold: 15, damageBonus: null, flatDamageBonus: 10, rangeBonus: 15, dc: 15 },
  { threshold: 20, damageBonus: null, flatDamageBonus: 15, rangeBonus: 20, dc: 20 },
];

export const RESONANCE_RESOURCE_KEY = "resonance";

export class ResonanceManager {
  /** Aktive Schwelle für gegebenen RP-Wert. */
  static activeThreshold(rp: number): ThresholdRule | null {
    let active: ThresholdRule | null = null;
    for (const rule of THRESHOLD_RULES) {
      if (rp >= rule.threshold) active = rule;
    }
    return active;
  }

  static evaluate(rp: number): ResonanceCheckResult {
    const rule = ResonanceManager.activeThreshold(rp);
    if (!rule) {
      return {
        threshold: 0,
        triggered: false,
        requiresStabilityCheck: false,
        dc: 0,
        damageBonus: null,
        rangeBonus: null,
      };
    }
    const damageBonus = rule.damageBonus
      ? rule.damageBonus
      : rule.flatDamageBonus !== null
      ? `+${rule.flatDamageBonus}`
      : null;
    return {
      threshold: rule.threshold,
      triggered: true,
      requiresStabilityCheck: rule.dc !== null,
      dc: rule.dc ?? 0,
      damageBonus,
      rangeBonus: rule.rangeBonus,
    };
  }

  /** Fügt RP zur Resonanz-Resource hinzu (Cantrips erzeugen 0). */
  static async addResonance(
    actor: ResourceCapableActor,
    amount: number,
  ): Promise<void> {
    if (amount <= 0) return;
    Logger.debug("Adding resonance", { actorId: actor.id, amount });
    await ResourceManager.modify(actor, RESONANCE_RESOURCE_KEY, amount);
  }

  /** Vollständiger Abbau, z. B. nach großer Rast. */
  static async clearResonance(actor: ResourceCapableActor): Promise<void> {
    await ResourceManager.setValue(actor, RESONANCE_RESOURCE_KEY, 0);
  }

  /** Reduziert RP um eine Wurfformel-Menge (1d4 / 1d10 / etc.). */
  static async releaseResonance(
    actor: ResourceCapableActor,
    formula: string,
  ): Promise<number> {
    const roll = new Roll(formula);
    await roll.evaluate({ async: true });
    const amount = Number(roll.total ?? 0);
    await ResourceManager.modify(actor, RESONANCE_RESOURCE_KEY, -amount);
    return amount;
  }
}
