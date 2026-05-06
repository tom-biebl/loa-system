import {
  WILD_MAGIC_ENTRIES,
  WILD_MAGIC_FORMULA,
  WILD_MAGIC_TABLE_NAME,
} from "./WildMagicTable.js";
import { Logger } from "../utils/Logger.js";

/**
 * Legt die Wild-Magic-RollTable in der Welt an, wenn sie noch nicht existiert.
 * Nur GMs dürfen die Welt bearbeiten — andere Clients überspringen die Aktion.
 */
export class WildMagicTableInstaller {
  static async ensure(): Promise<void> {
    if (typeof game === "undefined") return;
    if (!game.user?.isGM) return;
    const existing = WildMagicTableInstaller.find();
    if (existing) return;

    Logger.info("Installing Wild Magic RollTable");
    await RollTable.create({
      name: WILD_MAGIC_TABLE_NAME,
      formula: WILD_MAGIC_FORMULA,
      replacement: true,
      displayRoll: true,
      results: WILD_MAGIC_ENTRIES.map((entry) => ({
        type: 0,
        text: entry.text,
        range: entry.range,
        weight: 1,
      })),
    });
  }

  static find(): RollTable | undefined {
    return game.tables?.getName?.(WILD_MAGIC_TABLE_NAME);
  }
}
