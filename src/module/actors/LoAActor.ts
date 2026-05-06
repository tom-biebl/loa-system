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
