import { SYSTEM_LABEL } from "../constants/system.constants.js";
import type {
  ResonanceCheckResult,
  StabilityCheckResult,
} from "../types/roll.types.js";

interface SpellCastChatPayload {
  speaker?: unknown;
  spellName: string;
  resonanceTotal: number;
  resonanceCheck: ResonanceCheckResult;
  stabilityResult: StabilityCheckResult | null;
  consequence: string | null;
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

/**
 * Erzeugt Chat-Karten als ChatMessage. HTML wird hier zentral gebaut, damit
 * andere Services keine Markup-Strings duplizieren.
 *
 * Mittelfristig auf Handlebars-Templates verlagern (siehe paths.constants.ts).
 */
export class ChatCardRenderer {
  static async renderSpellCast(payload: SpellCastChatPayload): Promise<unknown> {
    const lines: string[] = [];
    lines.push(`<header><strong>${payload.spellName}</strong></header>`);
    lines.push(`<p>Resonanz nach Wirkung: <strong>${payload.resonanceTotal}</strong></p>`);

    if (payload.resonanceCheck.triggered) {
      const parts: string[] = [];
      parts.push(`Schwelle ${payload.resonanceCheck.threshold} erreicht.`);
      if (payload.resonanceCheck.damageBonus) {
        parts.push(`Schaden +${payload.resonanceCheck.damageBonus}`);
      }
      if (payload.resonanceCheck.rangeBonus) {
        parts.push(`Reichweite/AOE +${payload.resonanceCheck.rangeBonus} ft.`);
      }
      lines.push(`<p>${parts.join(" · ")}</p>`);
    }

    if (payload.stabilityResult) {
      const r = payload.stabilityResult;
      lines.push(
        `<p>Stabilität: ${r.total} vs DC ${r.dc} — ${r.success ? "bestanden" : "gescheitert"} (${r.outcome})</p>`,
      );
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

  static async renderDamage(payload: DamageChatPayload): Promise<unknown> {
    const html =
      `<div class="loa-chat-card loa-chat-damage">` +
      `<header><strong>${payload.actorName}</strong> erleidet ${payload.amount} ${payload.type}-Schaden.</header>` +
      `<p>HP: ${payload.remaining} / ${payload.max}</p>` +
      `</div>`;
    return ChatMessage.create({ flavor: SYSTEM_LABEL, content: html });
  }

  static async renderHeal(payload: HealChatPayload): Promise<unknown> {
    const html =
      `<div class="loa-chat-card loa-chat-heal">` +
      `<header><strong>${payload.actorName}</strong> wird um ${payload.amount} HP geheilt.</header>` +
      `<p>HP: ${payload.remaining} / ${payload.max}</p>` +
      `</div>`;
    return ChatMessage.create({ flavor: SYSTEM_LABEL, content: html });
  }
}
