import { Logger } from "../utils/Logger.js";
import type {
  AttributeRollOptions,
  RollOptions,
  StabilityCheckResult,
} from "../types/roll.types.js";
import { RollFormulaBuilder } from "./RollFormulaBuilder.js";

/**
 * Zentrale Anlaufstelle für Würfelwürfe. Sheets / Items / Hooks rufen hier auf,
 * statt selbst Roll-Instanzen zu erzeugen oder Chat-Messages zu schreiben.
 */
export class RollManager {
  static async roll(options: RollOptions): Promise<unknown> {
    const roll = new Roll(options.formula);
    await roll.evaluate({ async: true });
    if (options.flavor) {
      await roll.toMessage({
        speaker: options.speaker,
        flavor: options.flavor,
      });
    } else {
      await roll.toMessage({ speaker: options.speaker });
    }
    return roll;
  }

  static async rollAttribute(options: AttributeRollOptions): Promise<unknown> {
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

  /**
   * Führt einen Stabilitätswurf gegen eine DC aus und liefert das ausgewertete Ergebnis.
   * Die Konsequenzlogik (Wild Magic / Implosion / Fizzle) bleibt im StabilityCheckService.
   */
  static async rollStabilityCheck(
    modifier: number,
    dc: number,
    flavor: string = "Stabilitätswurf",
    speaker?: unknown,
  ): Promise<StabilityCheckResult> {
    const formula = RollFormulaBuilder.d20WithModifier(modifier);
    const roll = (await RollManager.roll({ formula, flavor, speaker })) as {
      total: number;
      dice: Array<{ results: Array<{ result: number }> }>;
    };

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
