import type { AttributeKey } from "../constants/system.constants.js";
import { ATTRIBUTE_KEYS } from "../constants/system.constants.js";
import type { LoAAttribute, LoAActorSystemData } from "../types/actor.types.js";
import { ATTRIBUTE_MAX, ATTRIBUTE_MIN } from "./AttributeCostTable.js";

/**
 * Reine Berechnungen rund um Attribute. Foundry-frei, damit testbar.
 */
export class AttributeService {
  /** Modifier = floor((value - 10) / 2). */
  static calculateModifier(value: number): number {
    return Math.floor((value - 10) / 2);
  }

  static clampAttributeValue(value: number): number {
    if (Number.isNaN(value)) return ATTRIBUTE_MIN;
    return Math.max(ATTRIBUTE_MIN, Math.min(ATTRIBUTE_MAX, Math.floor(value)));
  }

  /** Befüllt fehlende Modifier auf Basis der Attributwerte. */
  static deriveModifiers(attributes: Record<AttributeKey, LoAAttribute>): void {
    for (const key of ATTRIBUTE_KEYS) {
      const attr = attributes[key];
      if (!attr) continue;
      attr.modifier = AttributeService.calculateModifier(attr.value);
    }
  }

  static getAttribute(
    system: LoAActorSystemData,
    key: AttributeKey,
  ): LoAAttribute | undefined {
    return system.attributes[key];
  }
}
