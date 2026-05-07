import { SYSTEM_LABEL } from "../constants/system.constants.js";
import type {
  ResonanceCheckResult,
  StabilityCheckResult,
} from "../types/roll.types.js";
import type { EffectKind } from "../types/item.types.js";
import type { AttackResult } from "../combat/AttackService.js";

export interface HealOutcome {
  subjectName: string;
  amount: number;
}

interface SpellCastChatPayload {
  speaker?: unknown;
  spellName: string;
  spellImg?: string;
  effectKind: EffectKind;
  description: string;
  resonanceTotal: number;
  resonanceCheck: ResonanceCheckResult;
  stabilityResult: StabilityCheckResult | null;
  consequence: string | null;
  attacks: AttackResult[];
  heal: HealOutcome | null;
}

interface AttackChatPayload {
  speaker?: unknown;
  actorName: string;
  weaponName: string;
  weaponImg?: string;
  attacks: AttackResult[];
}

interface DamageChatPayload {
  actorName: string;
  amount: number;
  type: string;
  remaining: number;
  max: number;
}

interface HealChatPayload {
  actorName: string;
  amount: number;
  remaining: number;
  max: number;
}

interface UtilityChatPayload {
  speaker?: unknown;
  actorName: string;
  itemName: string;
  itemImg?: string;
  description: string;
}

interface ActionSpendChatPayload {
  speaker?: unknown;
  actorName: string;
  actionLabel: string;
  pluralLabel: string;
  description?: string;
  current: number;
  max: number;
}

interface PendingDamageFlagsLike {
  attackerName: string;
  targetName: string;
  source: string;
  damage: number;
  damageType: string;
  reactionUsed: string | null;
  resolved: boolean;
  dc: number | null;
}

/**
 * Erzeugt Chat-Karten als ChatMessage. HTML wird hier zentral gebaut, damit
 * andere Services keine Markup-Strings duplizieren.
 */
export class ChatCardRenderer {
  static async renderSpellCast(payload: SpellCastChatPayload): Promise<unknown> {
    const lines: string[] = [];
    const header = payload.spellImg
      ? `<header class="loa-chat-header"><img src="${payload.spellImg}" /><strong>${payload.spellName}</strong> · ${ChatCardRenderer.kindLabel(payload.effectKind)}</header>`
      : `<header class="loa-chat-header"><strong>${payload.spellName}</strong> · ${ChatCardRenderer.kindLabel(payload.effectKind)}</header>`;
    lines.push(header);
    lines.push(`<p>Resonanz nach Wirkung: <strong>${payload.resonanceTotal}</strong></p>`);

    if (payload.resonanceCheck.triggered) {
      const parts: string[] = [`Schwelle ${payload.resonanceCheck.threshold} erreicht.`];
      if (payload.resonanceCheck.damageBonus) parts.push(`Schaden +${payload.resonanceCheck.damageBonus}`);
      if (payload.resonanceCheck.rangeBonus) parts.push(`Reichweite +${payload.resonanceCheck.rangeBonus} ft.`);
      lines.push(`<p>${parts.join(" · ")}</p>`);
    }

    if (payload.stabilityResult) {
      const r = payload.stabilityResult;
      lines.push(
        `<p>Stabilität: ${r.total} vs DC ${r.dc} — ${r.success ? "bestanden" : "gescheitert"} (${r.outcome})</p>`,
      );
    }

    if (payload.effectKind === "damage" && payload.attacks.length > 0) {
      lines.push(ChatCardRenderer.renderAttackList(payload.attacks));
    }

    if (payload.effectKind === "heal" && payload.heal) {
      lines.push(
        `<p class="loa-chat-heal-info">Heilung an <strong>${payload.heal.subjectName}</strong>: <strong>${payload.heal.amount}</strong> HP.</p>`,
      );
    }

    if (payload.effectKind === "utility" && payload.description) {
      lines.push(`<div class="loa-chat-description">${payload.description}</div>`);
    }

    if (payload.consequence) {
      lines.push(`<p><em>${payload.consequence}</em></p>`);
    }

    return ChatMessage.create({
      speaker: payload.speaker,
      flavor: SYSTEM_LABEL,
      content: `<div class="loa-chat-card">${lines.join("")}</div>`,
    });
  }

  static async renderAttack(payload: AttackChatPayload): Promise<unknown> {
    const lines: string[] = [];
    const header = payload.weaponImg
      ? `<header class="loa-chat-header"><img src="${payload.weaponImg}" /><strong>${payload.actorName} — ${payload.weaponName}</strong></header>`
      : `<header class="loa-chat-header"><strong>${payload.actorName} — ${payload.weaponName}</strong></header>`;
    lines.push(header);
    lines.push(ChatCardRenderer.renderAttackList(payload.attacks));
    return ChatMessage.create({
      speaker: payload.speaker,
      flavor: SYSTEM_LABEL,
      content: `<div class="loa-chat-card">${lines.join("")}</div>`,
    });
  }

  static async renderActionSpend(payload: ActionSpendChatPayload): Promise<unknown> {
    const detail = payload.description ? `: <em>${payload.description}</em>` : "";
    const html =
      `<div class="loa-chat-card loa-chat-action">` +
      `<header class="loa-chat-header"><strong>${payload.actorName}</strong> verwendet eine ${payload.actionLabel}${detail}.</header>` +
      `<p>Verbleibende ${payload.pluralLabel}: <strong>${payload.current}</strong> / ${payload.max}</p>` +
      `</div>`;
    return ChatMessage.create({
      speaker: payload.speaker,
      flavor: SYSTEM_LABEL,
      content: html,
    });
  }

  static async renderUtility(payload: UtilityChatPayload): Promise<unknown> {
    const header = payload.itemImg
      ? `<header class="loa-chat-header"><img src="${payload.itemImg}" /><strong>${payload.actorName} · ${payload.itemName}</strong></header>`
      : `<header class="loa-chat-header"><strong>${payload.actorName} · ${payload.itemName}</strong></header>`;
    const description = payload.description
      ? `<div class="loa-chat-description">${payload.description}</div>`
      : "";
    return ChatMessage.create({
      speaker: payload.speaker,
      flavor: SYSTEM_LABEL,
      content: `<div class="loa-chat-card loa-chat-utility">${header}${description}</div>`,
    });
  }

  private static kindLabel(kind: EffectKind): string {
    switch (kind) {
      case "damage":
        return "Schaden";
      case "heal":
        return "Heilung";
      case "utility":
        return "Utility";
      case "reaction":
        return "Reaktion";
    }
  }

  private static renderAttackList(attacks: AttackResult[]): string {
    const items = attacks.map((a) => {
      if (a.targetName === null) {
        return `<li>Wurf: <strong>${a.attackTotal || "—"}</strong> · Schaden: <strong>${a.damageTotal}</strong> ${a.damageType}</li>`;
      }
      const status = a.hit ? "Treffer" : "Daneben";
      const dmg = a.hit ? ` · Schaden: <strong>${a.damageTotal}</strong> ${a.damageType}` : "";
      return `<li><strong>${a.targetName}</strong> (AC ${a.targetAC}) — Wurf ${a.attackTotal} · <em>${status}</em>${dmg}</li>`;
    });
    return `<ul class="loa-chat-attacks">${items.join("")}</ul>`;
  }

  /** HTML für eine Pending-Damage-Karte. Buttons werden via chatHooks angebunden. */
  static buildPendingDamage(flags: PendingDamageFlagsLike): string {
    const reaction = flags.reactionUsed
      ? `<p class="loa-pending-reaction"><em>Reaktion: ${flags.reactionUsed}</em></p>`
      : "";
    const dcLine =
      flags.dc !== null
        ? `<p class="loa-pending-dc">Reaktions-DC: <strong>${flags.dc}</strong></p>`
        : "";
    const buttons = flags.resolved
      ? `<p class="loa-pending-resolved">Schaden angewendet.</p>`
      : `<div class="loa-pending-actions">
          <button type="button" data-loa-action="react">Reagieren</button>
          <button type="button" data-loa-action="apply-damage">Schaden anwenden</button>
        </div>`;
    return `<div class="loa-chat-card loa-pending-damage" data-loa-pending="1">
      <header class="loa-chat-header"><strong>${flags.attackerName}</strong> trifft <strong>${flags.targetName}</strong></header>
      <p>Quelle: ${flags.source}</p>
      <p>Eingehender Schaden: <strong>${flags.damage}</strong> ${flags.damageType}</p>
      ${dcLine}
      ${reaction}
      ${buttons}
    </div>`;
  }

  static async renderDamage(payload: DamageChatPayload): Promise<unknown> {
    const html =
      `<div class="loa-chat-card loa-chat-damage">` +
      `<header class="loa-chat-header"><strong>${payload.actorName}</strong> erleidet ${payload.amount} ${payload.type}-Schaden.</header>` +
      `<p>HP: ${payload.remaining} / ${payload.max}</p>` +
      `</div>`;
    return ChatMessage.create({ flavor: SYSTEM_LABEL, content: html });
  }

  static async renderHeal(payload: HealChatPayload): Promise<unknown> {
    const html =
      `<div class="loa-chat-card loa-chat-heal">` +
      `<header class="loa-chat-header"><strong>${payload.actorName}</strong> wird um ${payload.amount} HP geheilt.</header>` +
      `<p>HP: ${payload.remaining} / ${payload.max}</p>` +
      `</div>`;
    return ChatMessage.create({ flavor: SYSTEM_LABEL, content: html });
  }
}
