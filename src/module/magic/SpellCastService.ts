import type { AttributeKey } from "../constants/system.constants.js";
import type { ResonanceCheckResult } from "../types/roll.types.js";
import type { EffectKind } from "../types/item.types.js";
import { ResonanceManager } from "./ResonanceManager.js";
import { StabilityCheckService } from "./StabilityCheckService.js";
import { WildMagicService } from "./WildMagicService.js";
import { TargetService } from "../combat/TargetService.js";
import { ReactionService } from "../combat/ReactionService.js";
import { DamageService } from "../combat/DamageService.js";
import { RollManager } from "../rolls/RollManager.js";
import { RollFormulaBuilder } from "../rolls/RollFormulaBuilder.js";
import { ChatCardRenderer, type HealOutcome } from "../chat/ChatCardRenderer.js";
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
    effectKind?: EffectKind;
    isCantrip?: boolean;
    generatesResonance?: boolean;
    resonanceCost?: number;
    damage?: string;
    damageType?: string;
    healFormula?: string;
    attackBonus?: number;
    attribute?: AttributeKey;
    description?: string;
  };
}

/**
 * Orchestriert das Wirken eines Zaubers nach Effekt-Art.
 * Resonance-Flow läuft IMMER (RP, Schwelle, Stability, Wild Magic).
 * Danach verzweigt:
 *   damage  → Attack-Roll vs. Targets, Pending-Damage-Karte
 *   heal    → Heal-Roll, Heilung auf Target oder Self
 *   utility → keine zusätzlichen Würfe
 */
interface CastOptions {
  dc?: number | null;
}

export class SpellCastService {
  static async cast(
    actor: SpellActorLike,
    spell: SpellLike,
    options: CastOptions = {},
  ): Promise<void> {
    const speaker = ChatMessage.getSpeaker({ actor });
    const kind = (spell.system.effectKind ?? "damage") as EffectKind;
    const dc = options.dc ?? null;

    const generates = !spell.system.isCantrip && Boolean(spell.system.generatesResonance);
    const cost = generates ? Number(spell.system.resonanceCost ?? 0) : 0;
    if (cost > 0) {
      await ResonanceManager.addResonance(actor, cost);
    }

    const resonanceTotal = actor.system.resources?.resonance?.value ?? 0;
    const resonanceCheck = ResonanceManager.evaluate(resonanceTotal);
    const stabilityResult = await StabilityCheckService.perform(actor, resonanceCheck, speaker);
    const consequence = stabilityResult ? await WildMagicService.describe(stabilityResult) : null;

    const attacks =
      kind === "damage"
        ? await SpellCastService.rollAttacks(actor, spell, resonanceCheck, speaker, dc)
        : [];

    const heal =
      kind === "heal"
        ? await SpellCastService.rollHeal(actor, spell, speaker)
        : null;

    await ChatCardRenderer.renderSpellCast({
      speaker,
      spellName: spell.name ?? "Zauber",
      spellImg: spell.img,
      effectKind: kind,
      description: spell.system.description ?? "",
      resonanceTotal,
      resonanceCheck,
      stabilityResult,
      consequence,
      attacks,
      heal,
    });
  }

  /** Schadenswurf vs. Targets (oder reiner Damage-Wurf, wenn kein Target). */
  private static async rollAttacks(
    actor: SpellActorLike,
    spell: SpellLike,
    resonance: ResonanceCheckResult,
    speaker: unknown,
    dc: number | null,
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
            dc,
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

  /** Heilt das anvisierte Token (sonst den Wirkenden). */
  private static async rollHeal(
    actor: SpellActorLike,
    spell: SpellLike,
    speaker: unknown,
  ): Promise<HealOutcome | null> {
    if (!spell.system.healFormula) return null;
    const targets = TargetService.getActors();
    const subject = targets[0] ?? actor;
    const subjectName = (subject as { name?: string }).name ?? "Selbst";
    const spellName = spell.name ?? "Zauber";

    const roll = await RollManager.evaluate(spell.system.healFormula);
    await RollManager.postRoll(roll, {
      speaker,
      flavor: `${spellName} → Heilung`,
    });
    const amount = Number(roll.total ?? 0);
    try {
      await DamageService.heal(subject as Parameters<typeof DamageService.heal>[0], amount);
    } catch (error) {
      Logger.warn("SpellCastService: heal apply failed", error);
    }
    return { subjectName, amount };
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
