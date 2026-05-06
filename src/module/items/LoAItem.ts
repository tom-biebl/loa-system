import type { ItemType } from "../constants/system.constants.js";
import type { LoAItemSystemData, SpellSystemData, WeaponSystemData } from "../types/item.types.js";
import { Logger } from "../utils/Logger.js";
import { SpellCastService } from "../magic/SpellCastService.js";
import { AttackService } from "../combat/AttackService.js";
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

  isWeapon(): this is LoAItem & { system: WeaponSystemData } {
    return this.type === "weapon";
  }

  /** Wirkt einen Zauber (siehe SpellCastService). */
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
    await SpellCastService.cast(actor, this);
  }

  /** Greift mit der Waffe an (Targets via Foundry-Targeting). */
  async attack(): Promise<void> {
    if (!this.isWeapon()) {
      Logger.warn("attack called on non-weapon item", { itemId: this.id });
      return;
    }
    const actor = this.actor;
    if (!actor) {
      ui.notifications?.warn("Angriff benötigt einen Charakter.");
      return;
    }
    await AttackService.rollWeaponAttack(actor, this);
  }
}
