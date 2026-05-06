import { Logger } from "../utils/Logger.js";
import type { StabilityCheckResult } from "../types/roll.types.js";
import { WildMagicTableInstaller } from "./WildMagicTableInstaller.js";
import { WILD_MAGIC_ENTRIES, WILD_MAGIC_FORMULA } from "./WildMagicTable.js";

/**
 * Übersetzt das Ergebnis eines Stabilitätswurfs in einen erzählerischen Effekt.
 * Bevorzugt die in der Welt vorhandene RollTable (vom GM editierbar) und
 * fällt auf die statische Tabelle zurück.
 */
export class WildMagicService {
  static async describe(result: StabilityCheckResult): Promise<string | null> {
    switch (result.outcome) {
      case "success":
        return null;
      case "fizzle":
        return "Der Zauber scheitert spurlos, die RP bleiben jedoch bestehen.";
      case "implosion":
        Logger.warn("Spell implosion triggered", result);
        return "Der Zauber implodiert und trifft den Zaubernden selbst.";
      case "wild-magic":
        return `Wilde Magie bricht hervor: ${await WildMagicService.rollEntryText()}`;
    }
  }

  /** Rollt aus der RollTable bzw. aus dem statischen Fallback. */
  static async rollEntryText(): Promise<string> {
    const table = WildMagicTableInstaller.find();
    if (table) {
      try {
        const draw = await table.draw({ displayChat: false });
        const first = draw.results?.[0];
        if (first?.text) return first.text;
        if (typeof first?.getChatText === "function") return first.getChatText();
      } catch (error) {
        Logger.warn("Wild Magic table draw failed, falling back", error);
      }
    }
    return WildMagicService.fallbackEntry();
  }

  private static fallbackEntry(): string {
    const sides = parseInt(WILD_MAGIC_FORMULA.replace(/^\d*d/, ""), 10) || 20;
    const roll = 1 + Math.floor(Math.random() * sides);
    const entry = WILD_MAGIC_ENTRIES.find(
      (e) => roll >= e.range[0] && roll <= e.range[1],
    );
    return entry?.text ?? "Etwas Magisches geschieht — der Effekt bleibt unklar.";
  }
}
