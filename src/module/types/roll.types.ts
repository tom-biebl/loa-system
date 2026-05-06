export interface RollOptions {
  formula: string;
  flavor?: string;
  speaker?: unknown;
}

export interface AttributeRollOptions {
  attributeLabel: string;
  modifier: number;
  bonus?: number;
  flavor?: string;
  speaker?: unknown;
}

export interface ResonanceCheckResult {
  threshold: number;
  triggered: boolean;
  requiresStabilityCheck: boolean;
  dc: number;
  damageBonus: string | null;
  rangeBonus: number | null;
}

export interface StabilityCheckResult {
  total: number;
  dc: number;
  delta: number;
  success: boolean;
  isCriticalFumble: boolean;
  outcome: "success" | "wild-magic" | "fizzle" | "implosion";
}
