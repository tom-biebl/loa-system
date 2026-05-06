import type { AttributeKey } from "../constants/system.constants.js";
import { ATTRIBUTE_LABELS } from "../constants/system.constants.js";
import type { LoAActorSystemData, LoAResource } from "../types/actor.types.js";
import { AttributeService } from "../attributes/AttributeService.js";
import { ResourceManager } from "../resources/ResourceManager.js";
import { Logger } from "../utils/Logger.js";
import { RollManager } from "../rolls/RollManager.js";

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
    LoAActor.deriveArmorClass(this);
  }

  /**
   * AC = base + Dex-Modifier + Summe(equipped armor.acBonus) + ac.bonus.
   * Dex-Modifier wird mit-eingerechnet, kann aber durch Sheets / Effekte
   * über `system.ac.bonus` (negativ) gekontert werden.
   */
  static deriveArmorClass(actor: LoAActor): void {
    const ac = actor.system.ac;
    if (!ac) return;
    const base = Number(ac.base ?? 10);
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
    ac.value = base + flat + dex + armor;
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
