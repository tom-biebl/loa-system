import type { ResonanceCheckResult, StabilityCheckResult } from "../types/roll.types.js";
import type { LoAActorSystemData } from "../types/actor.types.js";
import { AttributeService } from "../attributes/AttributeService.js";
import { RollManager } from "../rolls/RollManager.js";
import { Logger } from "../utils/Logger.js";

interface StabilityCheckActorLike {
  name?: string;
  system: LoAActorSystemData;
}

/**
 * Führt einen Stabilitätswurf durch, wenn die aktive Resonanzschwelle einen verlangt.
 * Welches Attribut verwendet wird, kommt vom Actor (`system.spellcasting.ability`)
 * und darf NICHT hartcodiert werden.
 */
export class StabilityCheckService {
  static async perform(
    actor: StabilityCheckActorLike,
    check: ResonanceCheckResult,
    speaker?: unknown,
  ): Promise<StabilityCheckResult | null> {
    if (!check.requiresStabilityCheck) return null;

    const ability = actor.system.spellcasting?.ability ?? "int";
    const attribute = AttributeService.getAttribute(actor.system, ability);
    const modifier = attribute?.modifier ?? 0;

    Logger.debug("Performing stability check", {
      actor: actor.name,
      ability,
      modifier,
      dc: check.dc,
    });

    return RollManager.rollStabilityCheck(
      modifier,
      check.dc,
      `Stabilitätswurf gegen DC ${check.dc}`,
      speaker,
    );
  }
}
