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
import { ActionEconomyService } from "../combat/ActionEconomy.js";
import { AoEService } from "../combat/AoEService.js";
import { normalizeActionType } from "../constants/action.constants.js";
import type { LoAActor } from "../actors/LoAActor.js";

/**
 * Foundry Item-Subklasse. Domänenlogik bleibt in Services, das Item selbst
 * orchestriert nur den Ablauf - und prüft, ob die nötige Aktion verfügbar ist.
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
    if (LoAItem.isReactionEffectKind(this.getEffectKind())) return "reaction";
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
    if (LoAItem.isReactionEffectKind(kind)) {
      ui.notifications?.info(
        "Reaktionen werden über die Pending-Damage-Karte ausgelöst, nicht direkt gewirkt.",
      );
      return;
    }

    // AoE-Placement VOR Action-Cost-Verbrauch — bricht der User ab, kostet's nichts.
    if (!(await this.runAoEIfNeeded())) return;

    if (!(await this.consumeActionCost(actor))) return;
    await SpellCastService.cast(actor, this);
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
    const kind = this.getEffectKind();
    if (LoAItem.isReactionEffectKind(kind)) {
      ui.notifications?.info(
        "Reaktionen werden über die Pending-Damage-Karte ausgelöst, nicht direkt verwendet.",
      );
      return;
    }

    if (!(await this.consumeActionCost(actor))) return;
    if (kind === "heal" || kind === "utility") {
      await AbilityUseService.use(actor, this);
      return;
    }
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
    if (LoAItem.isReactionEffectKind(kind)) {
      ui.notifications?.info(
        "Reaktionen werden über die Pending-Damage-Karte ausgelöst, nicht direkt verwendet.",
      );
      return;
    }

    if (!(await this.runAoEIfNeeded())) return;

    if (!(await this.consumeActionCost(actor))) return;
    await AbilityUseService.use(actor, this);
  }

  /**
   * Falls das Item ein aktiviertes AoE-Profil hat: Template platzieren,
   * Targets sammeln, als User-Targets setzen. Liefert false bei Abbruch.
   */
  async runAoEIfNeeded(): Promise<boolean> {
    const aoe = (this.system as { aoe?: { enabled?: boolean } }).aoe;
    if (!aoe?.enabled) return true;
    const result = await AoEService.placeAndCollect(aoe as any);
    if (!result) return false;
    return true;
  }

  private async consumeActionCost(actor: LoAActor): Promise<boolean> {
    const normalized = normalizeActionType(this.getActionCost());
    return ActionEconomyService.spendAction(actor, normalized, {
      description: this.name ?? undefined,
    });
  }

  private static isReactionEffectKind(kind: EffectKind): boolean {
    return kind === "reaction" || kind.startsWith("reaction_");
  }
}
