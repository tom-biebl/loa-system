import { ChatCardRenderer } from "../chat/ChatCardRenderer.js";
import { DamageService } from "../combat/DamageService.js";
import { ResourceManager, type ResourceCapableActor } from "../resources/ResourceManager.js";
import { RollManager } from "../rolls/RollManager.js";

interface RestActor extends ResourceCapableActor {
  name?: string;
}

const HP_KEY = "hp";
const RESONANCE_KEY = "resonance";

/**
 * Rast-Mechaniken für Actor-Ressourcen.
 */
export class RestService {
  static async longRest(actor: RestActor): Promise<void> {
    const hp = ResourceManager.get(actor, HP_KEY);
    const updates: Record<string, unknown> = {};
    if (hp) updates[`system.resources.${HP_KEY}.value`] = hp.max;
    if (ResourceManager.get(actor, RESONANCE_KEY)) {
      updates[`system.resources.${RESONANCE_KEY}.value`] = 0;
    }
    if (Object.keys(updates).length > 0) await actor.update(updates);

    await ChatCardRenderer.renderUtility({
      speaker: ChatMessage.getSpeaker({ actor }),
      actorName: actor.name ?? "Unbekannt",
      itemName: "Große Rast",
      description: "HP vollständig wiederhergestellt. Resonanz auf 0 gesetzt.",
    });
  }

  static async shortRest(actor: RestActor): Promise<void> {
    const speaker = ChatMessage.getSpeaker({ actor });
    const hpRoll = await RollManager.roll({
      formula: "2d12",
      flavor: `${actor.name ?? "Actor"} · Kleine Rast: HP`,
      speaker,
    });
    const hpRestored = await DamageService.heal(actor, Number(hpRoll.total ?? 0));

    const resonance = ResourceManager.get(actor, RESONANCE_KEY);
    let resonanceReduced = 0;
    if (resonance) {
      const resonanceRoll = await RollManager.roll({
        formula: "1d8",
        flavor: `${actor.name ?? "Actor"} · Kleine Rast: Resonanzabbau`,
        speaker,
      });
      resonanceReduced = Math.min(resonance.value, Number(resonanceRoll.total ?? 0));
      await ResourceManager.setValue(actor, RESONANCE_KEY, resonance.value - resonanceReduced);
    }

    await ChatCardRenderer.renderUtility({
      speaker,
      actorName: actor.name ?? "Unbekannt",
      itemName: "Kleine Rast",
      description: `HP geheilt: ${hpRestored}. Resonanzabbau: ${resonanceReduced}.`,
    });
  }
}
