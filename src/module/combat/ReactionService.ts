import { SYSTEM_ID, SYSTEM_LABEL } from "../constants/system.constants.js";
import type { AttributeKey } from "../constants/system.constants.js";
import type { ReactionMode } from "../types/item.types.js";
import { DamageService } from "./DamageService.js";
import { ActionEconomyService } from "./ActionEconomy.js";
import { ChatCardRenderer } from "../chat/ChatCardRenderer.js";
import { RollManager } from "../rolls/RollManager.js";
import { RollFormulaBuilder } from "../rolls/RollFormulaBuilder.js";
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
  /** Reaktions-DC, gegen die rolled/counter-Reaktionen würfeln. null = keine DC verfügbar (z.B. Waffenangriff). */
  dc: number | null;
}

const FLAG_SCOPE = SYSTEM_ID;

interface CreatePendingOptions {
  attackerName: string;
  targetActor: any;
  damage: number;
  damageType: string;
  source: string;
  dc: number | null;
}

interface ReactionEntry {
  id: string;
  name: string;
  mode: ReactionMode;
  formula: string;
  attribute: AttributeKey;
  /** Kann gegen den aktuellen Pending-Damage tatsächlich verwendet werden. */
  applicable: boolean;
  /** Erklärung, warum nicht (für Tooltip). */
  unavailableReason: string | null;
}

/**
 * Workflow für die Verteidiger-Reaktion auf einen Treffer.
 *
 * Reaktionen sind Items mit `effectKind === "reaction"` und einer `reactionMode`:
 *   flat    → Reduktion = Formel (Wurf oder Zahl)
 *   rolled  → 1d20 + Attribut vs. Pending-DC; Erfolg → Reduktion = Formel
 *   counter → 1d20 + Attribut vs. Pending-DC; Erfolg → Schaden = 0
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
    return flags as PendingDamageFlags;
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
        `Auf ${target.name} ist kein Item mit Effekt-Art „Reaktion" angelegt. Erstelle eine Ability oder einen Spell mit effectKind=Reaktion.`,
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

    const item = target.items?.get?.(reactionItemId);
    if (!item) return;

    const mode = (item.system?.reactionMode ?? "flat") as ReactionMode;
    const formula = String(item.system?.reactionFormula ?? "0");
    const attribute = (item.system?.reactionAttribute ?? "int") as AttributeKey;
    const speaker = ChatMessage.getSpeaker({ actor: target });

    if ((mode === "rolled" || mode === "counter") && flags.dc === null) {
      ui.notifications?.warn(
        "Diese Reaktion benötigt eine Reaktions-DC — der Angriff hat keine.",
      );
      return;
    }

    const ok = await ActionEconomyService.spendForCost(target, "reaction");
    if (!ok) {
      ui.notifications?.warn("Keine Reaktion mehr in dieser Runde übrig.");
      return;
    }

    let reduction = 0;
    let summary = item.name ?? "Reaktion";

    switch (mode) {
      case "flat": {
        reduction = await ReactionService.evaluateFormula(formula, speaker, `${item.name} → Block`);
        summary = `${item.name} (-${reduction})`;
        break;
      }
      case "rolled":
      case "counter": {
        const dc = flags.dc as number;
        const attrMod = Number(target.system?.attributes?.[attribute]?.modifier ?? 0);
        const checkRoll = await RollManager.evaluate(
          RollFormulaBuilder.d20WithModifier(attrMod),
        );
        await RollManager.postRoll(checkRoll, {
          speaker,
          flavor: `${item.name} → Wurf vs DC ${dc}`,
        });
        const total = Number(checkRoll.total ?? 0);
        const success = total >= dc;
        if (!success) {
          summary = `${item.name} (Wurf ${total} vs DC ${dc} → fehlgeschlagen)`;
        } else if (mode === "counter") {
          reduction = flags.damage;
          summary = `${item.name} (Wurf ${total} vs DC ${dc} → Gegenzauber gelingt)`;
        } else {
          reduction = await ReactionService.evaluateFormula(
            formula,
            speaker,
            `${item.name} → Reduktion`,
          );
          summary = `${item.name} (Wurf ${total} vs DC ${dc} → Erfolg, -${reduction})`;
        }
        break;
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
      item: item.name,
      mode,
      reduction,
    });
  }

  /**
   * Wertet eine Reduktions-Formel aus.
   * Reine Zahl wie `5` → 5. Würfelformel wie `1d6+2` → würfeln + zur Chat posten.
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

  /**
   * Sammelt alle Reaktions-Items des Actors. Items mit `effectKind: "reaction"`
   * werden bevorzugt — Items, die nur via veraltetem `damageReduction`-Feld
   * konfiguriert sind, werden als flat-Reaktion mitgenommen.
   */
  private static collectReactions(actor: any, flags: PendingDamageFlags): ReactionEntry[] {
    const items = actor.items?.contents ?? [];
    const result: ReactionEntry[] = [];
    for (const item of items) {
      const sys = item.system ?? {};
      const isReactionKind = sys.effectKind === "reaction";
      const legacyReduction = Number(sys.damageReduction ?? 0);
      const hasLegacy =
        !isReactionKind && legacyReduction > 0 && sys.actionCost === "reaction";

      if (!isReactionKind && !hasLegacy) continue;

      const mode: ReactionMode = isReactionKind
        ? ((sys.reactionMode ?? "flat") as ReactionMode)
        : "flat";
      const formula = isReactionKind ? String(sys.reactionFormula ?? "0") : String(legacyReduction);
      const attribute = (sys.reactionAttribute ?? "int") as AttributeKey;

      const needsDC = mode === "rolled" || mode === "counter";
      const applicable = !needsDC || flags.dc !== null;
      const unavailableReason = applicable
        ? null
        : "Diese Reaktion verlangt eine DC, der Angriff hat keine.";

      result.push({
        id: String(item.id ?? ""),
        name: String(item.name ?? "Reaktion"),
        mode,
        formula,
        attribute,
        applicable,
        unavailableReason,
      });
    }
    return result;
  }

  private static formatReactionLabel(entry: ReactionEntry): string {
    const modeLabel =
      entry.mode === "flat"
        ? `Block ${entry.formula}`
        : entry.mode === "counter"
        ? `Gegenzauber (${entry.attribute})`
        : `Wurf ${entry.attribute} → ${entry.formula}`;
    if (!entry.applicable) {
      return `${entry.name} — ${modeLabel} (nicht verfügbar)`;
    }
    return `${entry.name} · ${modeLabel}`;
  }

  /**
   * Dialog: fragt nach der Reaktions-DC, mit der eingehende Reaktionen würfeln.
   * Aufgerufen von Spell/Ability-Cast vor `createPending`. Liefert null bei Abbruch.
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
