import type { AttributeKey } from "../constants/system.constants.js";
import type { ResonanceCheckResult } from "../types/roll.types.js";
import { ResonanceManager } from "./ResonanceManager.js";
import { StabilityCheckService } from "./StabilityCheckService.js";
import { WildMagicService } from "./WildMagicService.js";
import { TargetService } from "../combat/TargetService.js";
import { ReactionService } from "../combat/ReactionService.js";
import { RollManager } from "../rolls/RollManager.js";
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
 * Orchestriert das Wirken eines Zaubers. Alle Würfe werden via toMessage gepostet,
 * sodass Dice-So-Nice sie animiert. Schaden wird NICHT sofort appliziert —
 * stattdessen erstellt der ReactionService eine Pending-Damage-Karte.
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

    const attacks = await SpellCastService.rollAttacks(actor, spell, resonanceCheck, speaker);

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
    speaker: unknown,
  ): Promise<AttackResult[]> {
    if (!spell.system.damage) return [];

    const attribute = (spell.system.attribute ?? "int") as AttributeKey;
    const attrMod = actor.system.attributes?.[attribute]?.modifier ?? 0;
    const bonus = Number(spell.system.attackBonus ?? 0);
    const damageType = spell.system.damageType ?? "arcane";
    const spellName = spell.name ?? "Zauber";

    const targets = TargetService.getActors();
    if (targets.length === 0) {
      const damageRoll = await RollManager.evaluate(spell.system.damage);
      await RollManager.postRoll(damageRoll, {
        speaker,
        flavor: `${spellName} → Schaden (${damageType})`,
      });
      const resBonus = await SpellCastService.resonanceBonus(resonance, speaker);
      const damageTotal = Number(damageRoll.total ?? 0) + resBonus;
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
      const targetAC = Number(target.system?.ac?.value ?? 0);
      const attackRoll = await RollManager.evaluate(
        RollFormulaBuilder.d20WithModifier(attrMod, bonus),
      );
      await RollManager.postRoll(attackRoll, {
        speaker,
        flavor: `${spellName} → Angriff vs ${target.name ?? "Ziel"} (AC ${targetAC})`,
      });
      const attackTotal = Number(attackRoll.total ?? 0);
      const hit = attackTotal >= targetAC;
      let damageTotal = 0;
      if (hit) {
        const damageRoll = await RollManager.evaluate(spell.system.damage);
        await RollManager.postRoll(damageRoll, {
          speaker,
          flavor: `${spellName} → Schaden (${damageType})`,
        });
        damageTotal = Number(damageRoll.total ?? 0);
        damageTotal += await SpellCastService.resonanceBonus(resonance, speaker);
        try {
          await ReactionService.createPending({
            attackerName: actor.name ?? "Unbekannt",
            targetActor: target,
            damage: damageTotal,
            damageType,
            source: spellName,
          });
        } catch (error) {
          Logger.warn("SpellCastService: pending damage failed", error);
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
  private static async resonanceBonus(
    resonance: ResonanceCheckResult,
    speaker: unknown,
  ): Promise<number> {
    if (!resonance.damageBonus) return 0;
    const bonus = resonance.damageBonus;
    if (/^[+\-]\d+$/.test(bonus)) return Number(bonus);
    const roll = await RollManager.evaluate(bonus);
    await RollManager.postRoll(roll, { speaker, flavor: `Resonanz-Bonus (${bonus})` });
    return Number(roll.total ?? 0);
  }
}
