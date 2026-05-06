import { ResourceManager, type ResourceCapableActor } from "../resources/ResourceManager.js";
import { RollManager } from "../rolls/RollManager.js";
import { ChatCardRenderer } from "../chat/ChatCardRenderer.js";
import { Logger } from "../utils/Logger.js";

export type DamageType = "physical" | "arcane" | "fire" | "cold" | "lightning" | "necrotic" | "radiant" | "true";

interface ApplyDamageOptions {
  type?: DamageType;
  resourceKey?: string;
  silent?: boolean;
}

interface DamageActor extends ResourceCapableActor {
  name?: string;
}

const HP_KEY = "hp";

/**
 * Wendet Schaden bzw. Heilung auf eine Foundry-Resource (HP per default) an.
 * Schadensresistenzen werden hier zentral eingehängt — derzeit Identitätsfunktion.
 */
export class DamageService {
  static async applyDamage(
    actor: DamageActor,
    amount: number,
    options: ApplyDamageOptions = {},
  ): Promise<number> {
    if (amount <= 0) return 0;
    const key = options.resourceKey ?? HP_KEY;
    const resource = ResourceManager.get(actor, key);
    if (!resource) {
      Logger.warn("DamageService: resource missing", { actorId: actor.id, key });
      return 0;
    }
    const final = DamageService.applyResistances(amount, options.type ?? "physical");
    const newValue = Math.max(0, resource.value - final);
    await actor.update({ [`system.resources.${key}.value`]: newValue });

    if (!options.silent) {
      await ChatCardRenderer.renderDamage({
        actorName: actor.name ?? "Ziel",
        amount: final,
        type: options.type ?? "physical",
        remaining: newValue,
        max: resource.max,
      });
    }
    return final;
  }

  /** Würfelt eine Damage-Formel und appliziert das Ergebnis. */
  static async rollAndApply(
    actor: DamageActor,
    formula: string,
    type: DamageType = "physical",
    flavor?: string,
  ): Promise<number> {
    const roll = (await RollManager.roll({ formula, flavor: flavor ?? `Schaden (${type})` })) as { total: number };
    const total = Number(roll.total ?? 0);
    return DamageService.applyDamage(actor, total, { type, silent: true });
  }

  static async heal(
    actor: DamageActor,
    amount: number,
    resourceKey: string = HP_KEY,
  ): Promise<number> {
    if (amount <= 0) return 0;
    const resource = ResourceManager.get(actor, resourceKey);
    if (!resource) return 0;
    const newValue = Math.min(resource.max, resource.value + amount);
    const restored = newValue - resource.value;
    await actor.update({ [`system.resources.${resourceKey}.value`]: newValue });
    await ChatCardRenderer.renderHeal({
      actorName: actor.name ?? "Ziel",
      amount: restored,
      remaining: newValue,
      max: resource.max,
    });
    return restored;
  }

  /**
   * Hook-Punkt für spätere Resistenzen / Verwundbarkeiten.
   * Derzeit ohne Effekt — bewusst datengetrieben erweiterbar.
   */
  private static applyResistances(amount: number, _type: DamageType): number {
    return amount;
  }
}
