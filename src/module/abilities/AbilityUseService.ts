import type { EffectKind } from "../types/item.types.js";
import { TargetService } from "../combat/TargetService.js";
import { ReactionService } from "../combat/ReactionService.js";
import { DamageService } from "../combat/DamageService.js";
import { RollManager } from "../rolls/RollManager.js";
import { ChatCardRenderer } from "../chat/ChatCardRenderer.js";
import { Logger } from "../utils/Logger.js";
import type { ResourceCapableActor } from "../resources/ResourceManager.js";

interface AbilityActor extends ResourceCapableActor {
  name?: string;
}

interface AbilityLike {
  name?: string;
  img?: string;
  system: {
    effectKind?: EffectKind;
    damage?: string;
    damageType?: string;
    healFormula?: string;
    description?: string;
  };
}

/**
 * Sheet-getriggerte Ausführung einer Ability.
 * Reaction-Abilities haben hier KEINEN eigenen „Verwenden"-Pfad — die werden
 * ausschließlich über den Pending-Damage-Dialog (ReactionService) ausgelöst.
 */
interface UseOptions {
  dc?: number | null;
}

export class AbilityUseService {
  static async use(
    actor: AbilityActor,
    ability: AbilityLike,
    options: UseOptions = {},
  ): Promise<void> {
    const speaker = ChatMessage.getSpeaker({ actor });
    const kind = (ability.system.effectKind ?? "utility") as EffectKind;
    const name = ability.name ?? "Fähigkeit";
    const dc = options.dc ?? null;

    switch (kind) {
      case "damage":
        await AbilityUseService.execDamage(actor, ability, speaker, name, dc);
        return;
      case "heal":
        await AbilityUseService.execHeal(actor, ability, speaker, name);
        return;
      case "utility":
      default:
        await ChatCardRenderer.renderUtility({
          speaker,
          actorName: actor.name ?? "Unbekannt",
          itemName: name,
          itemImg: ability.img,
          description: ability.system.description ?? "",
        });
    }
  }

  private static async execDamage(
    actor: AbilityActor,
    ability: AbilityLike,
    speaker: unknown,
    name: string,
    dc: number | null,
  ): Promise<void> {
    const formula = ability.system.damage;
    if (!formula) {
      ui.notifications?.warn(`${name}: keine Schadens-Formel hinterlegt.`);
      return;
    }
    const damageType = ability.system.damageType ?? "physical";
    const damageRoll = await RollManager.evaluate(formula);
    await RollManager.postRoll(damageRoll, {
      speaker,
      flavor: `${name} → Schaden (${damageType})`,
    });
    const damage = Number(damageRoll.total ?? 0);

    const targets = TargetService.getActors();
    if (targets.length === 0) {
      // Reine Anzeige
      return;
    }
    for (const target of targets) {
      try {
        await ReactionService.createPending({
          attackerName: actor.name ?? "Unbekannt",
          targetActor: target,
          damage,
          damageType,
          source: name,
          dc,
        });
      } catch (error) {
        Logger.warn("AbilityUseService: pending damage failed", error);
      }
    }
  }

  private static async execHeal(
    actor: AbilityActor,
    ability: AbilityLike,
    speaker: unknown,
    name: string,
  ): Promise<void> {
    const formula = ability.system.healFormula;
    if (!formula) {
      ui.notifications?.warn(`${name}: keine Heilungs-Formel hinterlegt.`);
      return;
    }
    const targets = TargetService.getActors();
    const subject = targets[0] ?? actor;
    const subjectName = (subject as { name?: string }).name ?? "Selbst";

    const roll = await RollManager.evaluate(formula);
    await RollManager.postRoll(roll, { speaker, flavor: `${name} → Heilung` });
    const amount = Number(roll.total ?? 0);
    try {
      await DamageService.heal(subject as Parameters<typeof DamageService.heal>[0], amount);
    } catch (error) {
      Logger.warn("AbilityUseService: heal apply failed", error);
    }
    await ChatCardRenderer.renderUtility({
      speaker,
      actorName: actor.name ?? "Unbekannt",
      itemName: name,
      itemImg: ability.img,
      description: `Heilung an <strong>${subjectName}</strong>: <strong>${amount}</strong> HP.`,
    });
  }
}
