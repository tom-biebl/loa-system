import type { AttributeKey } from "../constants/system.constants.js";
import type { ResonanceCheckResult } from "../types/roll.types.js";
import { ResonanceManager } from "./ResonanceManager.js";
import { StabilityCheckService } from "./StabilityCheckService.js";
import { WildMagicService } from "./WildMagicService.js";
import { TargetService } from "../combat/TargetService.js";
import { DamageService } from "../combat/DamageService.js";
import { RollFormulaBuilder } from "../rolls/RollFormulaBuilder.js";
import { ChatCardRenderer } from "../chat/ChatCardRenderer.js";
import { Logger } from "../utils/Logger.js";
import type { AttackResult } from "../combat/AttackService.js";
import type { ResourceCapableActor } from "../resources/ResourceManager.js";

interface SpellActorLike extends ResourceCapableActor {
  name?: string;
}

interface SpellLike {
  name?: string;
  img?: string;
  system: {
    isCantrip?: boolean;
    generatesResonance?: boolean;
    resonanceCost?: number;
    damage?: string;
    damageType?: string;
    attackBonus?: number;
    attribute?: AttributeKey;
  };
}

/**
 * Orchestriert das Wirken eines Zaubers:
 * 1. RP erhöhen (außer Cantrip)
 * 2. Resonanzschwelle bewerten
 * 3. Stabilitätswurf (wenn Schwelle es verlangt)
 * 4. Schadenswurf gegen Targets (Foundry-Targeting)
 * 5. Chat-Karte mit allem
 */
export class SpellCastService {
  static async cast(actor: SpellActorLike, spell: SpellLike): Promise<void> {
    const speaker = ChatMessage.getSpeaker({ actor });
    const generates = !spell.system.isCantrip && Boolean(spell.system.generatesResonance);
    const cost = generates ? Number(spell.system.resonanceCost ?? 0) : 0;
    if (cost > 0) {
      await ResonanceManager.addResonance(actor, cost);
    }

    const resonanceTotal = actor.system.resources?.resonance?.value ?? 0;
    const resonanceCheck = ResonanceManager.evaluate(resonanceTotal);

    const stabilityResult = await StabilityCheckService.perform(actor, resonanceCheck, speaker);
    const consequence = stabilityResult ? await WildMagicService.describe(stabilityResult) : null;

    const attacks = await SpellCastService.rollAttacks(actor, spell, resonanceCheck);

    await ChatCardRenderer.renderSpellCast({
      speaker,
      spellName: spell.name ?? "Zauber",
      spellImg: spell.img,
      resonanceTotal,
      resonanceCheck,
      stabilityResult,
      consequence,
      attacks,
    });
  }

  /** Würfelt Angriff & Schaden je Target — fällt auf reinen Schadenswurf zurück, wenn nichts anvisiert. */
  private static async rollAttacks(
    actor: SpellActorLike,
    spell: SpellLike,
    resonance: ResonanceCheckResult,
  ): Promise<AttackResult[]> {
    if (!spell.system.damage) return [];

    const attribute = (spell.system.attribute ?? "int") as AttributeKey;
    const attrMod = actor.system.attributes?.[attribute]?.modifier ?? 0;
    const bonus = Number(spell.system.attackBonus ?? 0);
    const damageType = spell.system.damageType ?? "arcane";

    const targets = TargetService.getActors();
    if (targets.length === 0) {
      const damageRoll = await new Roll(spell.system.damage).evaluate({ async: true });
      const damageTotal =
        Number(damageRoll.total ?? 0) + (await SpellCastService.resonanceBonus(resonance));
      return [
        {
          targetName: null,
          targetAC: null,
          attackTotal: 0,
          hit: null,
          damageTotal,
          damageType,
        },
      ];
    }

    const results: AttackResult[] = [];
    for (const target of targets) {
      const targetAC = Number(target.system?.ac?.value ?? 10);
      const attackRoll = await new Roll(
        RollFormulaBuilder.d20WithModifier(attrMod, bonus),
      ).evaluate({ async: true });
      const attackTotal = Number(attackRoll.total ?? 0);
      const hit = attackTotal >= targetAC;
      let damageTotal = 0;
      if (hit) {
        const damageRoll = await new Roll(spell.system.damage).evaluate({ async: true });
        damageTotal =
          Number(damageRoll.total ?? 0) +
          (await SpellCastService.resonanceBonus(resonance));
        try {
          await DamageService.applyDamage(target, damageTotal, {
            type: damageType as any,
            silent: true,
          });
        } catch (error) {
          Logger.warn("SpellCastService: damage apply failed", error);
        }
      }
      results.push({
        targetName: target.name ?? "Ziel",
        targetAC,
        attackTotal,
        hit,
        damageTotal,
        damageType,
      });
    }
    return results;
  }

  /** Übersetzt den damageBonus-String der Schwelle in Punkte (rollt Würfel-Anteile). */
  private static async resonanceBonus(resonance: ResonanceCheckResult): Promise<number> {
    if (!resonance.damageBonus) return 0;
    const bonus = resonance.damageBonus;
    if (/^[+\-]\d+$/.test(bonus)) return Number(bonus);
    const roll = await new Roll(bonus).evaluate({ async: true });
    return Number(roll.total ?? 0);
  }
}
