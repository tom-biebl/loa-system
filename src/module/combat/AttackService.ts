import type { AttributeKey } from "../constants/system.constants.js";
import { TargetService } from "./TargetService.js";
import { ReactionService } from "./ReactionService.js";
import { ChatCardRenderer } from "../chat/ChatCardRenderer.js";
import { RollManager } from "../rolls/RollManager.js";
import { RollFormulaBuilder } from "../rolls/RollFormulaBuilder.js";
import { Logger } from "../utils/Logger.js";

export interface AttackResult {
  targetName: string | null;
  targetAC: number | null;
  attackTotal: number;
  hit: boolean | null;
  damageTotal: number;
  damageType: string;
}

interface AttackSourceActor {
  id?: string | null;
  name?: string;
  system: { attributes?: Record<string, { modifier: number }> };
}

interface AttackWeapon {
  name?: string;
  img?: string;
  system: {
    damage?: string;
    damageType?: string;
    attackBonus?: number;
    attribute?: AttributeKey;
  };
}

/**
 * Würfelwürfe für Waffen-Angriffe. Sucht Targets via TargetService,
 * würfelt 1d20 + Attribut + Bonus gegen die AC. Bei Treffer wird der Schaden
 * NICHT direkt appliziert — der ReactionService erstellt eine Pending-Damage-Karte
 * und wartet, bis das Ziel reagiert oder der Schaden bestätigt wird.
 *
 * Alle Würfe gehen über `RollManager` und damit über `Roll.toMessage()` —
 * Dice-So-Nice greift diese Würfe und animiert sie.
 */
export class AttackService {
  static async rollWeaponAttack(
    actor: AttackSourceActor,
    weapon: AttackWeapon,
  ): Promise<AttackResult[]> {
    const targets = TargetService.getActors();
    const speaker = ChatMessage.getSpeaker({ actor });
    const attribute = (weapon.system.attribute ?? "str") as AttributeKey;
    const attrMod = actor.system.attributes?.[attribute]?.modifier ?? 0;
    const bonus = Number(weapon.system.attackBonus ?? 0);
    const damageFormula = (weapon.system.damage ?? "1d4") || "1d4";
    const damageType = weapon.system.damageType ?? "physical";
    const weaponName = weapon.name ?? "Waffe";

    if (targets.length === 0) {
      const result = await AttackService.rollUntargeted(
        attrMod,
        bonus,
        damageFormula,
        damageType,
        speaker,
        weaponName,
      );
      await ChatCardRenderer.renderAttack({
        speaker,
        actorName: actor.name ?? "Unbekannt",
        weaponName,
        weaponImg: weapon.img,
        attacks: [result],
      });
      return [result];
    }

    const attacks: AttackResult[] = [];
    for (const target of targets) {
      attacks.push(
        await AttackService.rollAgainstTarget(
          actor,
          target,
          attrMod,
          bonus,
          damageFormula,
          damageType,
          speaker,
          weaponName,
        ),
      );
    }
    await ChatCardRenderer.renderAttack({
      speaker,
      actorName: actor.name ?? "Unbekannt",
      weaponName,
      weaponImg: weapon.img,
      attacks,
    });
    return attacks;
  }

  static async rollAgainstTarget(
    attackerActor: AttackSourceActor,
    target: any,
    attrMod: number,
    bonus: number,
    damageFormula: string,
    damageType: string,
    speaker: unknown,
    weaponName: string,
  ): Promise<AttackResult> {
    const targetAC = Number(target.system?.ac?.value ?? 0);
    const attackFormula = RollFormulaBuilder.d20WithModifier(attrMod, bonus);

    const attackRoll = await RollManager.evaluate(attackFormula);
    await RollManager.postRoll(attackRoll, {
      speaker,
      flavor: `${weaponName} → Angriff vs ${target.name ?? "Ziel"} (AC ${targetAC})`,
    });
    const attackTotal = Number(attackRoll.total ?? 0);
    const hit = attackTotal >= targetAC;

    let damageTotal = 0;
    if (hit) {
      const damageRoll = await RollManager.evaluate(damageFormula);
      await RollManager.postRoll(damageRoll, {
        speaker,
        flavor: `${weaponName} → Schaden (${damageType})`,
      });
      damageTotal = Number(damageRoll.total ?? 0);
      try {
        await ReactionService.createPending({
          attackerName: attackerActor.name ?? "Unbekannt",
          targetActor: target,
          damage: damageTotal,
          damageType,
          source: weaponName,
        });
      } catch (error) {
        Logger.warn("AttackService: pending damage failed", error);
      }
    }

    return {
      targetName: target.name ?? "Ziel",
      targetAC,
      attackTotal,
      hit,
      damageTotal,
      damageType,
    };
  }

  static async rollUntargeted(
    attrMod: number,
    bonus: number,
    damageFormula: string,
    damageType: string,
    speaker: unknown,
    weaponName: string,
  ): Promise<AttackResult> {
    const attackFormula = RollFormulaBuilder.d20WithModifier(attrMod, bonus);
    const attackRoll = await RollManager.evaluate(attackFormula);
    await RollManager.postRoll(attackRoll, { speaker, flavor: `${weaponName} → Angriff` });
    const damageRoll = await RollManager.evaluate(damageFormula);
    await RollManager.postRoll(damageRoll, {
      speaker,
      flavor: `${weaponName} → Schaden (${damageType})`,
    });
    return {
      targetName: null,
      targetAC: null,
      attackTotal: Number(attackRoll.total ?? 0),
      hit: null,
      damageTotal: Number(damageRoll.total ?? 0),
      damageType,
    };
  }
}
