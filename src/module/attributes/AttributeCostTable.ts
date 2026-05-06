/**
 * Erweiterte Point-Buy-Kostentabelle für LoA.
 * Werte sind Gesamtkosten, NICHT inkrementelle Kosten.
 */
export const ATTRIBUTE_COST_TABLE: Readonly<Record<number, number>> = Object.freeze({
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
  16: 12,
  17: 15,
  18: 19,
  19: 24,
  20: 30,
});

export const ATTRIBUTE_MIN = 8;
export const ATTRIBUTE_MAX = 20;
export const DEFAULT_POINT_BUY_BUDGET = 27;
