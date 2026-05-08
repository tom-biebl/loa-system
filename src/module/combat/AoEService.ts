import { Logger } from "../utils/Logger.js";

export type AoEShape = "circle" | "cone";

export interface AoEConfig {
  enabled: boolean;
  shape: AoEShape | "none";
  /** Radius (Circle) oder Länge (Cone) in Scene-Units. */
  distance: number;
  /** Winkel in Grad — nur für Cone. */
  angle: number;
  /** Wurf- / Cast-Reichweite — nur Info. */
  range: number;
}

interface AoEPlacementResult {
  template: any;
  tokens: any[];
  actors: any[];
}

/**
 * Foundry MeasuredTemplate Integration für AoE-Spells / -Items.
 * Stellt Placement, Token-Erfassung und Auto-Targeting bereit.
 */
export class AoEService {
  /**
   * Öffnet den Placement-Preview, wartet auf Bestätigung, sammelt alle Tokens
   * im Template und setzt sie als User-Targets.
   *
   * @returns null wenn Placement abgebrochen oder ungültig.
   */
  static async placeAndCollect(
    aoe: AoEConfig | null | undefined,
  ): Promise<AoEPlacementResult | null> {
    if (!aoe?.enabled) return null;
    if (typeof canvas === "undefined" || !canvas?.scene) {
      ui.notifications?.warn("Keine aktive Szene für AoE-Placement.");
      return null;
    }

    const data = AoEService.buildTemplateData(aoe);
    if (!data) return null;

    const template = await AoEService.placeTemplate(data);
    if (!template) {
      Logger.debug("AoE placement abgebrochen oder fehlgeschlagen");
      return null;
    }

    const tokens = AoEService.findTokensInTemplate(template);
    const actors = tokens.map((t) => t?.actor).filter(Boolean);

    // Auto-Target — überschreibt vorherige Auswahl.
    try {
      const ids = tokens.map((t) => t.id).filter(Boolean);
      if (typeof game.user?.updateTokenTargets === "function") {
        await game.user.updateTokenTargets(ids);
      } else if (typeof game.user?.targets?.clear === "function") {
        game.user.targets.clear();
        for (const t of tokens) t.setTarget?.(true, { releaseOthers: false });
      }
    } catch (error) {
      Logger.warn("AoE: setting targets failed", error);
    }

    return { template, tokens, actors };
  }

  /** Räumt das Template wieder ab — z.B. nach Damage-Anwendung. Default: behalten. */
  static async cleanupTemplate(template: any): Promise<void> {
    if (!template?.delete) return;
    try {
      await template.delete();
    } catch (error) {
      Logger.warn("AoE: template cleanup failed", error);
    }
  }

  // ----------------- Internal -----------------

  private static buildTemplateData(aoe: AoEConfig): Record<string, unknown> | null {
    const shape = aoe.shape;
    if (shape !== "circle" && shape !== "cone") {
      ui.notifications?.warn("AoE-Shape nicht unterstützt (nur circle/cone).");
      return null;
    }
    const data: Record<string, unknown> = {
      t: shape,
      user: game.user?.id,
      distance: Math.max(1, Number(aoe.distance ?? 0)),
      direction: 0,
      x: 0,
      y: 0,
      fillColor: game.user?.color ?? "#a3812e",
    };
    if (shape === "cone") {
      data.angle = Math.max(1, Number(aoe.angle ?? 53.13));
    }
    return data;
  }

  private static async placeTemplate(data: Record<string, unknown>): Promise<any | null> {
    const TemplateCls = CONFIG.MeasuredTemplate?.documentClass;
    const ObjCls = CONFIG.MeasuredTemplate?.objectClass;
    if (!TemplateCls || !ObjCls) {
      ui.notifications?.warn("MeasuredTemplate-Klassen nicht verfügbar.");
      return null;
    }

    const doc = new TemplateCls(data, { parent: canvas.scene });
    const obj = new ObjCls(doc);

    return new Promise<any | null>((resolve) => {
      let resolved = false;
      const finish = (value: any | null) => {
        if (resolved) return;
        resolved = true;
        Hooks.off("createMeasuredTemplate", onCreated);
        document.removeEventListener("keydown", onKey, true);
        clearTimeout(timeout);
        resolve(value);
      };
      const onCreated = (template: any) => finish(template);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") finish(null);
      };
      Hooks.on("createMeasuredTemplate", onCreated);
      document.addEventListener("keydown", onKey, true);
      const timeout = setTimeout(() => finish(null), 120_000);

      try {
        const result = obj.drawPreview?.();
        // drawPreview gibt manchmal direkt eine Promise zurück — auch dann
        // greift der createMeasuredTemplate-Hook, also nichts extra zu tun.
        if (result && typeof result.then === "function") {
          result.catch(() => finish(null));
        }
      } catch (error) {
        Logger.warn("AoE: drawPreview failed", error);
        finish(null);
      }
    });
  }

  private static findTokensInTemplate(template: any): any[] {
    const placeables: any[] = canvas?.tokens?.placeables ?? [];
    if (placeables.length === 0) return [];

    const obj = template.object ?? template;
    const shape = obj?.shape ?? template.shape ?? null;
    if (!shape || typeof shape.contains !== "function") {
      Logger.warn("AoE: keine Shape am Template — keine Targets");
      return [];
    }

    const tx = Number(template.x ?? 0);
    const ty = Number(template.y ?? 0);
    const inside: any[] = [];
    for (const token of placeables) {
      const cx = Number(token?.center?.x ?? token?.x ?? 0);
      const cy = Number(token?.center?.y ?? token?.y ?? 0);
      if (shape.contains(cx - tx, cy - ty)) inside.push(token);
    }
    return inside;
  }
}
