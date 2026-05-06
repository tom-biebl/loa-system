import type { ItemType } from "../constants/system.constants.js";
import type { LoAItemSystemData, SpellSystemData } from "../types/item.types.js";
import { Logger } from "../utils/Logger.js";
import { ResonanceManager } from "../magic/ResonanceManager.js";
import { StabilityCheckService } from "../magic/StabilityCheckService.js";
import { WildMagicService } from "../magic/WildMagicService.js";
import { ChatCardRenderer } from "../chat/ChatCardRenderer.js";
import type { LoAActor } from "../actors/LoAActor.js";

/**
 * Foundry Item-Subklasse. Domänenlogik bleibt in Services, das Item selbst
 * orchestriert nur den Ablauf.
 */
export class LoAItem extends Item {
  declare type: ItemType;
  declare system: LoAItemSystemData;
  declare actor: LoAActor | null;

  isSpell(): this is LoAItem & { system: SpellSystemData } {
    return this.type === "spell";
  }

  /**
   * Wirkt einen Zauber: erzeugt RP (außer Cantrip), prüft Resonanzschwelle,
   * triggert ggf. Stabilitätswurf und veröffentlicht eine Chat Card.
   */
  async castSpell(): Promise<void> {
    if (!this.isSpell()) {
      Logger.warn("castSpell called on non-spell item", { itemId: this.id });
      return;
    }
    const actor = this.actor;
    if (!actor) {
      ui.notifications?.warn("Zauber benötigt einen Charakter.");
      return;
    }

    const spell = this.system;
    const speaker = ChatMessage.getSpeaker({ actor });
    const generates = !spell.isCantrip && spell.generatesResonance;
    const cost = generates ? spell.resonanceCost : 0;

    if (cost > 0) {
      await ResonanceManager.addResonance(actor, cost);
    }

    const resonanceTotal = actor.system.resources?.resonance?.value ?? 0;
    const resonanceCheck = ResonanceManager.evaluate(resonanceTotal);

    const stabilityResult = await StabilityCheckService.perform(
      actor,
      resonanceCheck,
      speaker,
    );
    const consequence = stabilityResult
      ? await WildMagicService.describe(stabilityResult)
      : null;

    await ChatCardRenderer.renderSpellCast({
      speaker,
      spellName: this.name ?? "Zauber",
      resonanceTotal,
      resonanceCheck,
      stabilityResult,
      consequence,
    });
  }
}
