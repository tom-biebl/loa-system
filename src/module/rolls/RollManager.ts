import { Logger } from "../utils/Logger.js";
import type {
  AttributeRollOptions,
  RollOptions,
  StabilityCheckResult,
} from "../types/roll.types.js";
import { RollFormulaBuilder } from "./RollFormulaBuilder.js";

interface EvaluatedRoll {
  total: number;
  formula: string;
  dice: Array<{ results: Array<{ result: number }> }>;
  toMessage(options?: Record<string, unknown>): Promise<unknown>;
}

interface MessageRollOptions {
  flavor?: string;
  speaker?: unknown;
}

/**
 * Zentrale Anlaufstelle für Würfelwürfe.
 *
 * Alle öffentlichen Wurf-Methoden gehen über `Roll.toMessage()`, damit
 * Dice-So-Nice (und andere Foundry-Hooks) den Wurf greifen können.
 */
export class RollManager {
  /** Wertet die Formel async aus und postet das Ergebnis als ChatMessage. */
  static async roll(options: RollOptions): Promise<EvaluatedRoll> {
    const roll = (await new Roll(options.formula).evaluate({ async: true })) as EvaluatedRoll;
    const messageOptions: Record<string, unknown> = { speaker: options.speaker };
    if (options.flavor) messageOptions.flavor = options.flavor;
    await roll.toMessage(messageOptions);
    return roll;
  }

  /** Wertet eine Formel aus, OHNE eine ChatMessage zu erzeugen. */
  static async evaluate(formula: string): Promise<EvaluatedRoll> {
    return (await new Roll(formula).evaluate({ async: true })) as EvaluatedRoll;
  }

  /**
   * Postet einen bereits evaluierten Roll. Wichtig, um Dice-So-Nice zu triggern,
   * wenn AttackService / SpellCastService den Wurf vorher selbst evaluiert haben.
   */
  static async postRoll(roll: EvaluatedRoll, options: MessageRollOptions = {}): Promise<unknown> {
    const messageOptions: Record<string, unknown> = { speaker: options.speaker };
    if (options.flavor) messageOptions.flavor = options.flavor;
    return roll.toMessage(messageOptions);
  }

  static async rollAttribute(options: AttributeRollOptions): Promise<EvaluatedRoll> {
    const formula = RollFormulaBuilder.d20WithModifier(
      options.modifier,
      options.bonus ?? 0,
    );
    Logger.debug("Rolling attribute", { ...options, formula });
    return RollManager.roll({
      formula,
      flavor: options.flavor ?? options.attributeLabel,
      speaker: options.speaker,
    });
  }

  /** Stabilitätswurf inkl. Outcome-Klassifikation. Wurf wird via toMessage gepostet. */
  static async rollStabilityCheck(
    modifier: number,
    dc: number,
    flavor: string = "Stabilitätswurf",
    speaker?: unknown,
  ): Promise<StabilityCheckResult> {
    const formula = RollFormulaBuilder.d20WithModifier(modifier);
    const roll = await RollManager.roll({ formula, flavor, speaker });

    const total = Number(roll.total ?? 0);
    const naturalRoll = roll.dice?.[0]?.results?.[0]?.result ?? 0;
    const delta = total - dc;
    const success = delta >= 0;

    let outcome: StabilityCheckResult["outcome"] = "success";
    if (naturalRoll === 1) outcome = "implosion";
    else if (!success && delta < -5) outcome = "fizzle";
    else if (!success) outcome = "wild-magic";

    return {
      total,
      dc,
      delta,
      success,
      isCriticalFumble: naturalRoll === 1,
      outcome,
    };
  }
}
