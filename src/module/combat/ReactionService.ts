import { SYSTEM_ID, SYSTEM_LABEL } from "../constants/system.constants.js";
import { DamageService } from "./DamageService.js";
import { ActionEconomyService } from "./ActionEconomy.js";
import { ChatCardRenderer } from "../chat/ChatCardRenderer.js";
import { Logger } from "../utils/Logger.js";

interface PendingDamageFlags {
  kind: "pending-damage";
  attackerName: string;
  targetActorId: string;
  targetName: string;
  source: string;
  damage: number;
  damageType: string;
  reactionUsed: string | null;
  resolved: boolean;
}

const FLAG_SCOPE = SYSTEM_ID;

interface CreatePendingOptions {
  attackerName: string;
  targetActor: any;
  damage: number;
  damageType: string;
  source: string;
}

/**
 * Workflow für die Verteidiger-Reaktion auf einen Treffer.
 * Schaden wird NICHT direkt appliziert — eine Pending-Damage-ChatMessage
 * gibt dem Verteidiger (oder GM) zwei Buttons: „Reagieren" und „Schaden anwenden".
 */
export class ReactionService {
  static async createPending(options: CreatePendingOptions): Promise<unknown> {
    const flags: PendingDamageFlags = {
      kind: "pending-damage",
      attackerName: options.attackerName,
      targetActorId: String(options.targetActor.id ?? ""),
      targetName: options.targetActor.name ?? "Ziel",
      source: options.source,
      damage: options.damage,
      damageType: options.damageType,
      reactionUsed: null,
      resolved: false,
    };

    const owners = ReactionService.findOwnerUserIds(options.targetActor);
    const messageData: Record<string, unknown> = {
      flavor: SYSTEM_LABEL,
      content: ChatCardRenderer.buildPendingDamage(flags),
      flags: { [FLAG_SCOPE]: flags },
    };
    if (owners.length > 0) messageData.whisper = owners;
    return ChatMessage.create(messageData);
  }

  static getFlags(message: any): PendingDamageFlags | null {
    const flags = message?.flags?.[FLAG_SCOPE] ?? message?.getFlag?.(FLAG_SCOPE);
    if (!flags || flags.kind !== "pending-damage") return null;
    return flags as PendingDamageFlags;
  }

  /** Erlaubt nur dem Eigentümer / GM, den Schaden zu bestätigen oder zu reagieren. */
  static canInteract(targetActor: any): boolean {
    if (typeof game === "undefined") return false;
    if (game.user?.isGM) return true;
    if (!targetActor) return false;
    if (typeof targetActor.testUserPermission === "function") {
      return targetActor.testUserPermission(game.user, "OWNER");
    }
    return false;
  }

  static async applyPending(message: any): Promise<void> {
    const flags = ReactionService.getFlags(message);
    if (!flags || flags.resolved) return;
    const target = game.actors?.get?.(flags.targetActorId);
    if (!target) {
      ui.notifications?.warn("Ziel nicht mehr verfügbar.");
      return;
    }
    if (!ReactionService.canInteract(target)) {
      ui.notifications?.warn("Nur das Ziel oder der GM kann den Schaden anwenden.");
      return;
    }
    await DamageService.applyDamage(target, flags.damage, {
      type: flags.damageType as any,
    });
    const updated: PendingDamageFlags = { ...flags, resolved: true };
    await message.update({
      content: ChatCardRenderer.buildPendingDamage(updated),
      flags: { [FLAG_SCOPE]: updated },
    });
  }

  static async openReactionDialog(message: any): Promise<void> {
    const flags = ReactionService.getFlags(message);
    if (!flags || flags.resolved) return;
    const target = game.actors?.get?.(flags.targetActorId);
    if (!target) return;
    if (!ReactionService.canInteract(target)) {
      ui.notifications?.warn("Nur das Ziel oder der GM kann reagieren.");
      return;
    }

    const reactions = ReactionService.collectReactions(target);
    if (reactions.length === 0) {
      ui.notifications?.info("Dieses Ziel hat keine Reaktionen verfügbar.");
      return;
    }

    const buttons: Record<string, unknown> = {};
    for (const reaction of reactions) {
      buttons[reaction.id] = {
        label: `${reaction.name} (-${reaction.reduction})`,
        callback: async () => {
          await ReactionService.useReaction(message, target, reaction.id);
        },
      };
    }
    buttons.cancel = { label: "Abbrechen" };

    new Dialog({
      title: `Reaktion für ${target.name}`,
      content: `<p>${flags.attackerName} verursacht ${flags.damage} ${flags.damageType}-Schaden. Welche Reaktion?</p>`,
      buttons,
      default: "cancel",
    }).render(true);
  }

  static async useReaction(
    message: any,
    target: any,
    reactionItemId: string,
  ): Promise<void> {
    const flags = ReactionService.getFlags(message);
    if (!flags || flags.resolved) return;

    const item = target.items?.get?.(reactionItemId);
    if (!item) return;

    const ok = await ActionEconomyService.spend(target, "reactions", 1);
    if (!ok) {
      ui.notifications?.warn("Keine Reaktion mehr in dieser Runde übrig.");
      return;
    }

    const reduction = Math.max(0, Number(item.system?.damageReduction ?? 0));
    const newDamage = Math.max(0, flags.damage - reduction);
    const updated: PendingDamageFlags = {
      ...flags,
      damage: newDamage,
      reactionUsed: item.name ?? "Reaktion",
    };
    await message.update({
      content: ChatCardRenderer.buildPendingDamage(updated),
      flags: { [FLAG_SCOPE]: updated },
    });
    Logger.info("Reaction used", { actor: target.name, item: item.name, reduction });
  }

  /** Sucht alle Items mit `actionCost === "reaction"` (mind. ability-Typ). */
  private static collectReactions(actor: any): Array<{
    id: string;
    name: string;
    reduction: number;
  }> {
    const items = actor.items?.contents ?? [];
    return items
      .filter((it: any) => it.system?.actionCost === "reaction")
      .map((it: any) => ({
        id: String(it.id ?? ""),
        name: String(it.name ?? "Reaktion"),
        reduction: Math.max(0, Number(it.system?.damageReduction ?? 0)),
      }));
  }

  private static findOwnerUserIds(actor: any): string[] {
    if (typeof game === "undefined") return [];
    const users = game.users?.contents ?? [];
    const ids: string[] = [];
    for (const user of users) {
      if (user.isGM) continue;
      try {
        if (typeof actor.testUserPermission === "function") {
          if (actor.testUserPermission(user, "OWNER")) ids.push(user.id);
        }
      } catch {
        /* ignore */
      }
    }
    return ids;
  }
}
