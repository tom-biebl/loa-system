import type { ReactionTriggerKey } from "../constants/action.constants.js";
import { Logger } from "../utils/Logger.js";

/**
 * Architektur-Skeleton für triggerbasierte Reaktionsangebote.
 *
 * Idee: Andere Module rufen `ReactionOfferService.offer(trigger, context)`,
 * sobald ein potenziell reaktions-auslösendes Ereignis passiert (z.B.
 * `before_damage_applied`). Der Service findet passende Reaktions-Items,
 * postet eine ChatMessage / öffnet einen Dialog und übergibt dann an den
 * jeweiligen Verbrauchspfad.
 *
 * Aktuell wird der Workflow für `before_damage_applied` direkt vom
 * ReactionService (Pending-Damage-Karte) abgehandelt — diese Klasse ist
 * der Einstiegspunkt für künftige Trigger.
 */

export interface ReactionContext {
  trigger: ReactionTriggerKey;
  sourceActor?: any;
  targetActor?: any;
  actionType?: string;
  damage?: number;
  damageType?: string;
  metadata?: Record<string, unknown>;
}

export class ReactionOfferService {
  /** Stub: protokolliert das Angebot, lässt sich später erweitern. */
  static async offer(context: ReactionContext): Promise<void> {
    Logger.debug("Reaction offer", context);
    // Spätere Implementierung:
    //  - findReactions(targetActor, trigger)
    //  - whisper ChatMessage mit Optionen
    //  - User-Klick → ReactionService.useReaction(...)
  }

  /** Liefert alle Reaktions-Items des Actors, die auf einen bestimmten Trigger reagieren. */
  static collectFor(actor: any, trigger: ReactionTriggerKey): any[] {
    const items = actor?.items?.contents ?? [];
    return items.filter((item: any) => {
      const effectKind = String(item.system?.effectKind ?? "");
      if (effectKind !== "reaction" && !effectKind.startsWith("reaction_")) return false;
      const itemTrigger =
        (item.system?.reactionTrigger as ReactionTriggerKey | undefined) ?? "before_damage_applied";
      return itemTrigger === trigger;
    });
  }
}
