import { SYSTEM_ID, SYSTEM_LABEL } from "../constants/system.constants.js";
import type { AttributeKey } from "../constants/system.constants.js";
import type { EffectKind, ReactionMode } from "../types/item.types.js";
import { DamageService } from "./DamageService.js";
import { ActionEconomyService } from "./ActionEconomy.js";
import { ChatCardRenderer } from "../chat/ChatCardRenderer.js";
import { RollManager } from "../rolls/RollManager.js";
import { RollFormulaBuilder } from "../rolls/RollFormulaBuilder.js";
import { Logger } from "../utils/Logger.js";

type ReactionKind = "reduce_damage" | "counter" | "dodge" | "custom";

interface PendingDamageFlags {
  kind: "pending-damage";
  attackerName: string;
  targetActorId: string;
  targetName: string;
  source: string;
  sourceItemType: string | null;
  damage: number;
  damageType: string;
  reactionUsed: string | null;
  resolved: boolean;
  /** DC = 8 + Modifier des Primär-Attributs des angreifenden Items. */
  dc: number | null;
}

const FLAG_SCOPE = SYSTEM_ID;

interface CreatePendingOptions {
  attackerName: string;
  targetActor: any;
  damage: number;
  damageType: string;
  source: string;
  sourceItemType?: string | null;
  dc: number | null;
}

interface ReactionEntry {
  id: string;
  name: string;
  itemType: string;
  kind: ReactionKind;
  rolled: boolean;
  formula: string;
  attribute: AttributeKey;
  message: string;
  applicable: boolean;
  unavailableReason: string | null;
}

/**
 * Workflow für die Verteidiger-Reaktion auf einen Treffer.
 *
 * Reaktionen sind Items mit konkretem `effectKind`:
 * - `reaction_reduce_damage` reduziert Schaden um Formel/Fixwert
 * - `reaction_counter` negiert Zauber-Schaden
 * - `reaction_dodge` negiert Schaden durch Ausweichen
 * - `reaction_custom` postet eine frei gepflegte Chat-Nachricht
 */
export class ReactionService {
  static async createPending(options: CreatePendingOptions): Promise<unknown> {
    const flags: PendingDamageFlags = {
      kind: "pending-damage",
      attackerName: options.attackerName,
      targetActorId: String(options.targetActor.id ?? ""),
      targetName: options.targetActor.name ?? "Ziel",
      source: options.source,
      sourceItemType: options.sourceItemType ?? null,
      damage: options.damage,
      damageType: options.damageType,
      reactionUsed: null,
      resolved: false,
      dc: options.dc,
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
    return {
      sourceItemType: null,
      ...flags,
    } as PendingDamageFlags;
  }

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

    const reactions = ReactionService.collectReactions(target, flags);
    if (reactions.length === 0) {
      Logger.info("No reaction items configured", {
        actor: target.name,
        items: (target.items?.contents ?? []).map((i: any) => ({
          name: i.name,
          type: i.type,
          effectKind: i.system?.effectKind,
          actionCost: i.system?.actionCost,
        })),
      });
      ui.notifications?.info(
        `Auf ${target.name} ist kein Reaktions-Item angelegt.`,
      );
      return;
    }

    const buttons: Record<string, unknown> = {};
    for (const reaction of reactions) {
      const label = ReactionService.formatReactionLabel(reaction);
      const button: Record<string, unknown> = { label };
      if (reaction.applicable) {
        button.callback = async () => {
          await ReactionService.useReaction(message, target, reaction.id);
        };
      }
      buttons[reaction.id] = button;
    }
    buttons.cancel = { label: "Abbrechen" };

    const dcLine = flags.dc !== null ? `<p>Reaktions-DC: <strong>${flags.dc}</strong></p>` : "";
    new Dialog({
      title: `Reaktion für ${target.name}`,
      content: `<p>${flags.attackerName} verursacht ${flags.damage} ${flags.damageType}-Schaden.</p>${dcLine}`,
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

    const reaction = ReactionService.collectReactions(target, flags).find(
      (entry) => entry.id === reactionItemId,
    );
    if (!reaction) return;
    if (!reaction.applicable) {
      ui.notifications?.warn(reaction.unavailableReason ?? "Reaktion nicht verfügbar.");
      return;
    }

    const ok = await ActionEconomyService.spendForCost(target, "reaction");
    if (!ok) {
      ui.notifications?.warn("Keine Reaktion mehr in dieser Runde übrig.");
      return;
    }

    const speaker = ChatMessage.getSpeaker({ actor: target });
    const rollResult = reaction.rolled
      ? await ReactionService.rollReactionCheck(target, reaction, flags, speaker)
      : { success: true, summary: "" };

    let reduction = 0;
    let summary = reaction.name;

    if (!rollResult.success) {
      summary = `${reaction.name} (${rollResult.summary} fehlgeschlagen)`;
    } else {
      switch (reaction.kind) {
        case "reduce_damage": {
          reduction = await ReactionService.evaluateFormula(
            reaction.formula,
            speaker,
            `${reaction.name} → Reduktion`,
          );
          summary = ReactionService.withRollSummary(
            `${reaction.name} (-${reduction})`,
            rollResult.summary,
          );
          break;
        }
        case "counter": {
          reduction = flags.damage;
          summary = ReactionService.withRollSummary(
            `${reaction.name} (Counter gelingt)`,
            rollResult.summary,
          );
          break;
        }
        case "dodge": {
          reduction = flags.damage;
          summary = ReactionService.withRollSummary(
            `${reaction.name} (Ausweichen gelingt)`,
            rollResult.summary,
          );
          break;
        }
        case "custom": {
          await ChatCardRenderer.renderUtility({
            speaker,
            actorName: target.name ?? "Unbekannt",
            itemName: reaction.name,
            description: reaction.message || "Reaktion ausgelöst.",
          });
          summary = ReactionService.withRollSummary(
            `${reaction.name} (Custom)`,
            rollResult.summary,
          );
          break;
        }
      }
    }

    const newDamage = Math.max(0, flags.damage - reduction);
    const updated: PendingDamageFlags = {
      ...flags,
      damage: newDamage,
      reactionUsed: summary,
    };
    await message.update({
      content: ChatCardRenderer.buildPendingDamage(updated),
      flags: { [FLAG_SCOPE]: updated },
    });
    Logger.info("Reaction used", {
      actor: target.name,
      item: reaction.name,
      kind: reaction.kind,
      reduction,
    });
  }

  private static async rollReactionCheck(
    target: any,
    reaction: ReactionEntry,
    flags: PendingDamageFlags,
    speaker: unknown,
  ): Promise<{ success: boolean; summary: string }> {
    if (flags.dc === null) {
      return { success: false, summary: "keine DC verfügbar" };
    }
    const attrMod = Number(target.system?.attributes?.[reaction.attribute]?.modifier ?? 0);
    const checkRoll = await RollManager.evaluate(
      RollFormulaBuilder.d20WithModifier(attrMod),
    );
    await RollManager.postRoll(checkRoll, {
      speaker,
      flavor: `${reaction.name} → Wurf vs DC ${flags.dc}`,
    });
    const total = Number(checkRoll.total ?? 0);
    return {
      success: total >= flags.dc,
      summary: `Wurf ${total} vs DC ${flags.dc}`,
    };
  }

  private static withRollSummary(base: string, rollSummary: string): string {
    return rollSummary ? `${base} (${rollSummary})` : base;
  }

  /**
   * Wertet eine Reduktions-Formel aus.
   * Reine Zahl wie `5` -> 5. Würfelformel wie `1d6+2` -> würfeln + zur Chat posten.
   */
  private static async evaluateFormula(
    formula: string,
    speaker: unknown,
    flavor: string,
  ): Promise<number> {
    const trimmed = String(formula ?? "").trim();
    if (!trimmed) return 0;
    if (/^[+\-]?\d+$/.test(trimmed)) {
      return Math.max(0, Number(trimmed));
    }
    try {
      const roll = await RollManager.evaluate(trimmed);
      await RollManager.postRoll(roll, { speaker, flavor });
      return Math.max(0, Number(roll.total ?? 0));
    } catch (error) {
      Logger.warn("Reaction formula failed to roll", { formula: trimmed, error });
      return 0;
    }
  }

  private static collectReactions(actor: any, flags: PendingDamageFlags): ReactionEntry[] {
    const items = actor.items?.contents ?? [];
    const result: ReactionEntry[] = [];
    for (const item of items) {
      const sys = item.system ?? {};
      const legacyReduction = Number(sys.damageReduction ?? 0);
      const reactionKind = ReactionService.resolveReactionKind(
        sys.effectKind,
        sys.reactionMode,
        sys.reactionTypeKey,
        legacyReduction,
      );
      if (!reactionKind) continue;

      const rolled =
        Boolean(sys.reactionRolled) ||
        (sys.effectKind === "reaction" &&
          (sys.reactionMode === "rolled" || sys.reactionMode === "counter"));
      const formula =
        sys.effectKind === "reaction" || legacyReduction <= 0
          ? String(sys.reactionFormula ?? "0")
          : String(legacyReduction);
      const entry: ReactionEntry = {
        id: String(item.id ?? ""),
        name: String(item.name ?? "Reaktion"),
        itemType: String(item.type ?? ""),
        kind: reactionKind,
        rolled,
        formula,
        attribute: (sys.reactionAttribute ?? "int") as AttributeKey,
        message: String(sys.reactionMessage ?? sys.description ?? ""),
        applicable: true,
        unavailableReason: null,
      };

      ReactionService.applyAvailability(entry, flags);
      result.push(entry);
    }
    return result;
  }

  private static resolveReactionKind(
    effectKind: EffectKind | string | undefined,
    reactionMode: ReactionMode | string | undefined,
    reactionTypeKey: string | undefined,
    legacyReduction: number,
  ): ReactionKind | null {
    switch (effectKind) {
      case "reaction_reduce_damage":
        return "reduce_damage";
      case "reaction_counter":
        return "counter";
      case "reaction_dodge":
        return "dodge";
      case "reaction_custom":
        return "custom";
      case "reaction":
        return reactionMode === "counter" ? "counter" : "reduce_damage";
      default:
        if (legacyReduction > 0) return "reduce_damage";
        if (reactionTypeKey === "counter") return "counter";
        if (reactionTypeKey === "dodge") return "dodge";
        if (reactionTypeKey === "custom") return "custom";
        return null;
    }
  }

  private static applyAvailability(entry: ReactionEntry, flags: PendingDamageFlags): void {
    if (entry.kind === "counter" && entry.itemType !== "spell") {
      entry.applicable = false;
      entry.unavailableReason = "Counter ist nur mit Spell-Reaktionen möglich.";
      return;
    }
    if (entry.kind === "counter" && flags.sourceItemType !== "spell") {
      entry.applicable = false;
      entry.unavailableReason = "Counter kann nur gegen Zauber genutzt werden.";
      return;
    }
    if (entry.kind === "dodge" && entry.itemType !== "ability") {
      entry.applicable = false;
      entry.unavailableReason = "Dodge ist nur mit Ability-Reaktionen möglich.";
      return;
    }
    if (entry.rolled && flags.dc === null) {
      entry.applicable = false;
      entry.unavailableReason = "Diese Reaktion verlangt eine DC, der Angriff hat keine.";
    }
  }

  private static formatReactionLabel(entry: ReactionEntry): string {
    const kindLabel =
      entry.kind === "reduce_damage"
        ? `Schadensreduktion ${entry.formula}`
        : entry.kind === "counter"
        ? "Counter"
        : entry.kind === "dodge"
        ? "Dodge"
        : "Custom";
    const rollLabel = entry.rolled ? ` · Wurf ${entry.attribute}` : "";
    if (!entry.applicable) {
      return `${entry.name} — ${kindLabel}${rollLabel} (nicht verfügbar)`;
    }
    return `${entry.name} · ${kindLabel}${rollLabel}`;
  }

  /**
   * Legacy-Dialog für alte Aufrufer. Neue Damage-Quellen berechnen die DC
   * automatisch als 8 + Modifier des Primär-Attributs.
   */
  static async promptDC(itemName: string, defaultDC: number): Promise<number | null> {
    return new Promise((resolve) => {
      const dialog = new Dialog(
        {
          title: `Reaktions-DC für ${itemName}`,
          content: `
            <form>
              <p>DC, gegen die Reaktionen wie Gegenzauber würfeln.</p>
              <div class="form-group">
                <label for="loa-dc-input">Reaktions-DC</label>
                <input id="loa-dc-input" name="dc" type="number" min="0" value="${defaultDC}" autofocus />
              </div>
            </form>
          `,
          buttons: {
            ok: {
              label: "Bestätigen",
              callback: (html: any) => {
                const root: HTMLElement | null =
                  (html as { get?: (i: number) => HTMLElement }).get?.(0) ??
                  (html as HTMLElement) ??
                  null;
                const input = root?.querySelector(
                  "input[name='dc']",
                ) as HTMLInputElement | null;
                const raw = input?.value ?? `${defaultDC}`;
                const parsed = Number.parseInt(raw, 10);
                resolve(Number.isFinite(parsed) ? parsed : defaultDC);
              },
            },
            cancel: {
              label: "Abbrechen",
              callback: () => resolve(null),
            },
          },
          default: "ok",
          close: () => resolve(null),
        },
        { jQuery: false },
      );
      dialog.render(true);
    });
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
