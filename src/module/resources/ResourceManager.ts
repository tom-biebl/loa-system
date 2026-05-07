import { Logger } from "../utils/Logger.js";
import type { LoAResource, LoAActorSystemData } from "../types/actor.types.js";

/**
 * Generischer Zugriff auf Actor-Ressourcen. Hält die Foundry-Update-Pfade an einer Stelle,
 * damit neue Ressourcenarten ohne Sheet-/Item-Refactoring hinzugefügt werden können.
 *
 * Erwartet einen `actor` mit `system.resources` und einer `update`-Methode (Foundry Document).
 */
export interface ResourceCapableActor {
  id?: string | null;
  system: LoAActorSystemData;
  update(diff: Record<string, unknown>): Promise<unknown>;
}

export class ResourceManager {
  static get(actor: ResourceCapableActor, key: string): LoAResource | undefined {
    return actor.system.resources?.[key] as LoAResource | undefined;
  }

  static async setValue(
    actor: ResourceCapableActor,
    key: string,
    value: number,
  ): Promise<void> {
    const resource = ResourceManager.get(actor, key);
    if (!resource) {
      Logger.warn("Resource not found on actor", { actorId: actor.id, key });
      return;
    }
    const clamped = Math.max(0, Math.min(value, resource.max));
    await actor.update({ [`system.resources.${key}.value`]: clamped });
  }

  static async modify(
    actor: ResourceCapableActor,
    key: string,
    delta: number,
  ): Promise<void> {
    const resource = ResourceManager.get(actor, key);
    if (!resource) {
      Logger.warn("Resource not found on actor", { actorId: actor.id, key });
      return;
    }
    await ResourceManager.setValue(actor, key, resource.value + delta);
  }

  static async spend(
    actor: ResourceCapableActor,
    key: string,
    amount: number,
  ): Promise<boolean> {
    const resource = ResourceManager.get(actor, key);
    if (!resource) return false;
    if (resource.value < amount) return false;
    await ResourceManager.modify(actor, key, -amount);
    return true;
  }

  static async restore(
    actor: ResourceCapableActor,
    key: string,
  ): Promise<void> {
    const resource = ResourceManager.get(actor, key);
    if (!resource) return;
    await ResourceManager.setValue(actor, key, resource.max);
  }

  /** Hilft Builder/UI: Anteil 0..1 für Balken-Anzeigen. */
  static ratio(resource: LoAResource | undefined): number {
    if (!resource || resource.max <= 0) return 0;
    return Math.max(0, Math.min(1, resource.value / resource.max));
  }
}
