import { TEMPLATE_PATHS } from "../constants/paths.constants.js";
import { SYSTEM_ID } from "../constants/system.constants.js";
import type { LoAItem } from "./LoAItem.js";

/**
 * Generisches Item-Sheet. Pro Item-Typ wird ein passendes Template ausgewählt.
 */
export class LoAItemSheet extends ItemSheet {
  declare item: LoAItem;

  static override get defaultOptions(): Record<string, unknown> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [SYSTEM_ID, "sheet", "item"],
      width: 520,
      height: 480,
    });
  }

  override get template(): string {
    switch (this.item.type) {
      case "weapon":
        return TEMPLATE_PATHS.itemWeapon;
      case "spell":
        return TEMPLATE_PATHS.itemSpell;
      default:
        return TEMPLATE_PATHS.itemGeneric;
    }
  }

  override getData(options: unknown): Record<string, unknown> {
    const data = super.getData(options) as Record<string, unknown>;
    data.system = this.item.system;
    data.itemType = this.item.type;
    return data;
  }

  override activateListeners(html: JQuery | HTMLElement): void {
    super.activateListeners(html);
    if (!this.isEditable) return;

    const root: HTMLElement | null =
      (html as { get?: (i: number) => HTMLElement }).get?.(0) ??
      (html as HTMLElement) ??
      null;
    if (!root) return;

    const item = this.item;
    const buttons = root.querySelectorAll(
      "[data-action='cast-spell']",
    ) as NodeListOf<HTMLElement>;
    buttons.forEach((el: HTMLElement) => {
      el.addEventListener("click", (event: Event) => {
        event.preventDefault();
        void item.castSpell();
      });
    });
  }
}
