import type { AttributeKey } from "../constants/system.constants.js";
import { ATTRIBUTE_LABELS } from "../constants/system.constants.js";
import type { LoAActorSystemData, LoAResource } from "../types/actor.types.js";
import { AttributeService } from "../attributes/AttributeService.js";
import { ResourceManager } from "../resources/ResourceManager.js";
import { Logger } from "../utils/Logger.js";
import { RollManager } from "../rolls/RollManager.js";

const HP_PER_CON_POINT = 10;

/**
 * Foundry Actor-Subklasse. Hält bewusst nur Komfortmethoden.
 * Spielregeln liegen in Services (AttributeService, ResourceManager, ...).
 */
export class LoAActor extends Actor {
  declare system: LoAActorSystemData;

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    if (this.system?.attributes) {
      AttributeService.deriveModifiers(this.system.attributes);
    }
    LoAActor.deriveHitPoints(this);
    LoAActor.deriveArmorClass(this);
  }

  /** HP-Max ergibt sich aus Constitution: 1 Con-Punkt = 10 HP. Aktueller Wert wird geclampt. */
  static deriveHitPoints(actor: LoAActor): void {
    const con = actor.system.attributes?.con?.value ?? 10;
    const hp = actor.system.resources?.hp;
    if (!hp) return;
    hp.max = Math.max(0, Number(con) * HP_PER_CON_POINT);
    if (hp.value > hp.max) hp.value = hp.max;
    if (hp.value < 0) hp.value = 0;
  }

  /**
   * AC = Dex-Modifier + Summe(equipped armor.acBonus) + manueller Bonus.
   * Es gibt KEINE Base-AC — wer keine Rüstung trägt und 0 Dex hat, hat AC 0.
   */
  static deriveArmorClass(actor: LoAActor): void {
    const ac = actor.system.ac;
    if (!ac) return;
    const flat = Number(ac.bonus ?? 0);
    const dex = actor.system.attributes?.dex?.modifier ?? 0;
    let armor = 0;
    const items = (actor.items?.contents ?? []) as Array<{
      type: string;
      system?: { equipped?: boolean; acBonus?: number };
    }>;
    for (const item of items) {
      if (item.type === "armor" && item.system?.equipped) {
        armor += Number(item.system?.acBonus ?? 0);
      }
    }
    ac.value = flat + dex + armor;
  }

  getResource(key: string): LoAResource | undefined {
    return ResourceManager.get(this, key);
  }

  async spendResource(key: string, amount: number): Promise<boolean> {
    return ResourceManager.spend(this, key, amount);
  }

  async rollAttribute(key: AttributeKey, bonus: number = 0): Promise<unknown> {
    const attribute = this.system.attributes?.[key];
    if (!attribute) {
      Logger.warn("Attribute not found", { actorId: this.id, key });
      ui.notifications?.warn(`Attribut ${key} nicht gefunden.`);
      return null;
    }
    return RollManager.rollAttribute({
      attributeLabel: ATTRIBUTE_LABELS[key],
      modifier: attribute.modifier,
      bonus,
      speaker: ChatMessage.getSpeaker({ actor: this }),
    });
  }
}
