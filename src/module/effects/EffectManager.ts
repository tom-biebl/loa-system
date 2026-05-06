import { EffectFactory, type EffectDefinition } from "./EffectFactory.js";
import { Logger } from "../utils/Logger.js";

interface EffectCapableActor {
  id?: string | null;
  name?: string;
  effects?: { contents: ActiveEffect[] };
  createEmbeddedDocuments(type: string, data: unknown[]): Promise<unknown[]>;
  deleteEmbeddedDocuments(type: string, ids: string[]): Promise<unknown[]>;
}

const EMBED_TYPE = "ActiveEffect";

/**
 * Zentraler Service für ActiveEffects. Sheets und Items rufen hier auf, statt
 * `createEmbeddedDocuments` direkt zu verwenden.
 */
export class EffectManager {
  static async apply(
    actor: EffectCapableActor,
    definition: EffectDefinition,
  ): Promise<unknown[]> {
    Logger.debug("Applying effect", { actorId: actor.id, name: definition.name });
    return actor.createEmbeddedDocuments(EMBED_TYPE, [
      EffectFactory.toFoundryData(definition),
    ]);
  }

  static async remove(actor: EffectCapableActor, effectId: string): Promise<void> {
    await actor.deleteEmbeddedDocuments(EMBED_TYPE, [effectId]);
  }

  static find(actor: EffectCapableActor, statusId: string): ActiveEffect | undefined {
    const list = actor.effects?.contents ?? [];
    return list.find((effect) => effect.statuses?.has(statusId));
  }

  static isActive(actor: EffectCapableActor, statusId: string): boolean {
    const found = EffectManager.find(actor, statusId);
    return Boolean(found && !found.disabled);
  }

  /** Schaltet einen statusbasierten Effekt um. */
  static async toggle(
    actor: EffectCapableActor,
    definition: EffectDefinition,
  ): Promise<boolean> {
    const status = definition.statuses?.[0];
    if (!status) {
      await EffectManager.apply(actor, definition);
      return true;
    }
    const existing = EffectManager.find(actor, status);
    if (existing) {
      await EffectManager.remove(actor, existing.id);
      return false;
    }
    await EffectManager.apply(actor, definition);
    return true;
  }
}
