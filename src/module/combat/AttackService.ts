import type { AttributeKey } from "../constants/system.constants.js";
import { TargetService } from "./TargetService.js";
import { DamageService } from "./DamageService.js";
import { ChatCardRenderer } from "../chat/ChatCardRenderer.js";
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
 * würfelt 1d20 + Attribut + Bonus gegen die AC und appliziert Schaden bei Treffer.
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

    if (targets.length === 0) {
      const result = await AttackService.rollUntargeted(attrMod, bonus, damageFormula, damageType);
      await ChatCardRenderer.renderAttack({
        speaker,
        actorName: actor.name ?? "Unbekannt",
        weaponName: weapon.name ?? "Waffe",
        weaponImg: weapon.img,
        attacks: [result],
      });
      return [result];
    }

    const attacks: AttackResult[] = [];
    for (const target of targets) {
      attacks.push(
        await AttackService.rollAgainstTarget(target, attrMod, bonus, damageFormula, damageType),
      );
    }
    await ChatCardRenderer.renderAttack({
      speaker,
      actorName: actor.name ?? "Unbekannt",
      weaponName: weapon.name ?? "Waffe",
      weaponImg: weapon.img,
      attacks,
    });
    return attacks;
  }

  /** Wurf gegen ein konkretes Ziel inkl. Schadensanwendung. */
  static async rollAgainstTarget(
    target: any,
    attrMod: number,
    bonus: number,
    damageFormula: string,
    damageType: string,
  ): Promise<AttackResult> {
    const targetAC = Number(target.system?.ac?.value ?? 10);
    const attackFormula = RollFormulaBuilder.d20WithModifier(attrMod, bonus);
    const attackRoll = await new Roll(attackFormula).evaluate({ async: true });
    const attackTotal = Number(attackRoll.total ?? 0);
    const hit = attackTotal >= targetAC;

    let damageTotal = 0;
    if (hit) {
      const damageRoll = await new Roll(damageFormula).evaluate({ async: true });
      damageTotal = Number(damageRoll.total ?? 0);
      try {
        await DamageService.applyDamage(target, damageTotal, { type: damageType as any, silent: true });
      } catch (error) {
        Logger.warn("AttackService: damage apply failed", error);
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
  ): Promise<AttackResult> {
    const attackFormula = RollFormulaBuilder.d20WithModifier(attrMod, bonus);
    const attackRoll = await new Roll(attackFormula).evaluate({ async: true });
    const damageRoll = await new Roll(damageFormula).evaluate({ async: true });
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
