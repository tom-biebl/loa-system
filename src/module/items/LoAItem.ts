import type { ItemType } from "../constants/system.constants.js";
import type {
  ActionCost,
  EffectKind,
  LoAItemSystemData,
  SpellSystemData,
  WeaponSystemData,
} from "../types/item.types.js";
import { Logger } from "../utils/Logger.js";
import { SpellCastService } from "../magic/SpellCastService.js";
import { AttackService } from "../combat/AttackService.js";
import { AbilityUseService } from "../abilities/AbilityUseService.js";
import { ReactionService } from "../combat/ReactionService.js";
import { ActionEconomyService } from "../combat/ActionEconomy.js";
import { normalizeActionType } from "../constants/action.constants.js";
import type { LoAActor } from "../actors/LoAActor.js";

/**
 * Foundry Item-Subklasse. Domänenlogik bleibt in Services, das Item selbst
 * orchestriert nur den Ablauf — und prüft, ob die nötige Aktion verfügbar ist.
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

  isAbility(): boolean {
    return this.type === "ability";
  }

  getActionCost(): ActionCost {
    const value = (this.system as { actionCost?: ActionCost }).actionCost;
    return value ?? "action";
  }

  getEffectKind(): EffectKind {
    const value = (this.system as { effectKind?: EffectKind }).effectKind;
    return value ?? "damage";
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
    const kind = this.getEffectKind();
    if (kind === "reaction") {
      ui.notifications?.info(
        "Reaktionen werden über die Pending-Damage-Karte ausgelöst, nicht direkt gewirkt.",
      );
      return;
    }

    // DC-Dialog VOR Action-Cost-Verbrauch — sonst kostet's beim Abbrechen.
    let dc: number | null = null;
    if (kind === "damage") {
      const defaultDC = Number(this.system.reactionDC ?? 10);
      dc = await ReactionService.promptDC(this.name ?? "Zauber", defaultDC);
      if (dc === null) return;
    }

    if (!(await this.consumeActionCost(actor))) return;
    await SpellCastService.cast(actor, this, { dc });
  }

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
    if (!(await this.consumeActionCost(actor))) return;
    await AttackService.rollWeaponAttack(actor, this);
  }

  /** Verwendet eine Ability vom Sheet aus (kein Resonance-Flow). */
  async useAbility(): Promise<void> {
    if (!this.isAbility()) {
      Logger.warn("useAbility called on non-ability item", { itemId: this.id });
      return;
    }
    const actor = this.actor;
    if (!actor) {
      ui.notifications?.warn("Fähigkeit benötigt einen Charakter.");
      return;
    }
    const kind = this.getEffectKind();
    if (kind === "reaction") {
      ui.notifications?.info(
        "Reaktionen werden über die Pending-Damage-Karte ausgelöst, nicht direkt verwendet.",
      );
      return;
    }

    let dc: number | null = null;
    if (kind === "damage") {
      const defaultDC = Number((this.system as { reactionDC?: number }).reactionDC ?? 10);
      dc = await ReactionService.promptDC(this.name ?? "Fähigkeit", defaultDC);
      if (dc === null) return;
    }

    if (!(await this.consumeActionCost(actor))) return;
    await AbilityUseService.use(actor, this, { dc });
  }

  private async consumeActionCost(actor: LoAActor): Promise<boolean> {
    const normalized = normalizeActionType(this.getActionCost());
    return ActionEconomyService.spendAction(actor, normalized, {
      description: this.name ?? undefined,
    });
  }
}
