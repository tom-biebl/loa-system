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
      case "armor":
        return TEMPLATE_PATHS.itemArmor;
      case "ability":
        return TEMPLATE_PATHS.itemAbility;
      case "consumable":
        return TEMPLATE_PATHS.itemConsumable;
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
    const effectSelect = root.querySelector(
      "[data-loa-effect-kind]",
    ) as HTMLSelectElement | null;
    effectSelect?.addEventListener("change", async (event: Event) => {
      const value = (event.target as HTMLSelectElement).value;
      if (!LoAItemSheet.isReactionEffect(value)) return;
      const costSelect = root.querySelector(
        "[data-loa-action-cost]",
      ) as HTMLSelectElement | null;
      if (costSelect) costSelect.value = "reaction";
      await item.update({ "system.actionCost": "reaction" });
    });

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

  private static isReactionEffect(value: string | null | undefined): boolean {
    return value === "reaction" || String(value ?? "").startsWith("reaction_");
  }
}
