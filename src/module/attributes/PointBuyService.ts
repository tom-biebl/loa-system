import type { AttributeKey } from "../constants/system.constants.js";
import { ATTRIBUTE_KEYS } from "../constants/system.constants.js";
import type { LoAAttribute } from "../types/actor.types.js";
import {
  ATTRIBUTE_COST_TABLE,
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  DEFAULT_POINT_BUY_BUDGET,
} from "./AttributeCostTable.js";

/**
 * Berechnet Kosten und Restpunkte für das LoA-Point-Buy-System.
 * Cost-Werte sind Gesamtkosten je Attribut, summiert über alle Attribute.
 */
export class PointBuyService {
  /** Gesamtkosten eines einzelnen Attributwerts (8..20). */
  static costForValue(value: number): number {
    if (value < ATTRIBUTE_MIN) return 0;
    if (value > ATTRIBUTE_MAX) return Number.POSITIVE_INFINITY;
    return ATTRIBUTE_COST_TABLE[value] ?? Number.POSITIVE_INFINITY;
  }

  static totalSpent(attributes: Record<AttributeKey, LoAAttribute>): number {
    let total = 0;
    for (const key of ATTRIBUTE_KEYS) {
      const attr = attributes[key];
      if (!attr) continue;
      total += PointBuyService.costForValue(attr.value);
    }
    return total;
  }

  static remainingBudget(
    attributes: Record<AttributeKey, LoAAttribute>,
    budget: number = DEFAULT_POINT_BUY_BUDGET,
  ): number {
    return budget - PointBuyService.totalSpent(attributes);
  }

  /** Inkrementeller Aufpreis, um vom aktuellen Wert um eine Stufe zu steigen. */
  static stepUpCost(currentValue: number): number | null {
    if (currentValue >= ATTRIBUTE_MAX) return null;
    const next = currentValue + 1;
    return PointBuyService.costForValue(next) - PointBuyService.costForValue(currentValue);
  }
}
