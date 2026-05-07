import { TEMPLATE_PATHS } from "../constants/paths.constants.js";
import { SYSTEM_ID } from "../constants/system.constants.js";
import type { AttributeKey } from "../constants/system.constants.js";
import { ActorDataBuilder } from "./ActorDataBuilder.js";
import { InventoryService } from "../inventory/InventoryService.js";
import { Logger } from "../utils/Logger.js";
import type { LoAActor } from "./LoAActor.js";

type DropZone = "backpack" | "armor" | "spellbook";

/**
 * Sheet-Controller. Koordiniert UI / Inputs, delegiert Mechanik an Services.
 *
 * - Drop-Zonen `backpack` / `armor` / `spellbook` validieren das Item-Type
 * - Backpack-Kapazität wird gegen InventoryService geprüft
 * - Action-Buttons rufen Item.castSpell / Item.attack / Equip-Toggle auf
 */
export class LoAActorSheet extends ActorSheet {
  declare actor: LoAActor;

  static override get defaultOptions(): Record<string, unknown> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [SYSTEM_ID, "sheet", "actor"],
      template: TEMPLATE_PATHS.actorCharacter,
      width: 960,
      height: 760,
      tabs: [
        {
          navSelector: ".loa-tabs",
          contentSelector: ".loa-content",
          initial: "main",
        },
      ],
      dragDrop: [{ dragSelector: ".loa-draggable", dropSelector: ".loa-dropzone" }],
    });
  }

  override get template(): string {
    if (this.actor.type === "npc") return TEMPLATE_PATHS.actorNpc;
    return TEMPLATE_PATHS.actorCharacter;
  }

  override getData(options: unknown): Record<string, unknown> {
    const data = super.getData(options) as Record<string, unknown>;
    const system = this.actor.system;
    data.system = system;
    data.viewModel = ActorDataBuilder.build(this.actor);
    data.items = this.actor.items?.contents ?? [];
    return data;
  }

  override activateListeners(html: JQuery | HTMLElement): void {
    super.activateListeners(html);
    if (!this.isEditable) return;
    const root = LoAActorSheet.unwrap(html);
    if (!root) return;

    this.bindAttributeRolls(root);
    this.bindItemActions(root);
    this.bindBackpackSearch(root);
  }

  /** Volltextsuche über Item-Name/Type/Description im Rucksack. */
  private bindBackpackSearch(root: HTMLElement): void {
    const input = root.querySelector(
      "[data-loa-search='backpack']",
    ) as HTMLInputElement | null;
    if (!input) return;
    const grid = root.querySelector(".loa-backpack-grid") as HTMLElement | null;
    if (!grid) return;

    const apply = (query: string): void => {
      const needle = query.trim().toLowerCase();
      const slots = grid.querySelectorAll<HTMLElement>(".loa-slot");
      slots.forEach((slot) => {
        if (slot.dataset.searchEmpty === "1") {
          slot.style.display = needle ? "none" : "";
          return;
        }
        const haystack = (slot.dataset.searchHaystack ?? "").toLowerCase();
        const match = !needle || haystack.includes(needle);
        slot.style.display = match ? "" : "none";
      });
    };

    input.addEventListener("input", (event) => {
      apply((event.target as HTMLInputElement).value);
    });
  }

  /** Foundry ruft das beim Drop auf eine .loa-dropzone auf. */
  override async _onDrop(event: DragEvent): Promise<unknown> {
    const data = TextEditor.getDragEventData(event) as { type?: string; uuid?: string };
    if (data.type !== "Item") return super._onDrop(event);

    const target = event.target as HTMLElement | null;
    const zoneEl = target?.closest("[data-drop-zone]") as HTMLElement | null;
    const zone = (zoneEl?.dataset.dropZone as DropZone | undefined) ?? "backpack";

    const item = await Item.implementation.fromDropData(data);
    if (!item) return null;

    const isInternal = data.uuid?.includes(this.actor.uuid ?? "::") ?? false;

    if (!LoAActorSheet.validateZoneFit(zone, item.type)) return null;

    if (zone === "backpack" && !isInternal) {
      if (!InventoryService.canAccept(this.actor, item)) {
        ui.notifications?.warn("Der Rucksack ist voll.");
        return null;
      }
    }

    if (zone === "armor") {
      await this.equipArmor(item, isInternal);
      return null;
    }

    if (isInternal) {
      // Spell- oder Backpack-Drop eines bereits eigenen Items: nichts zu tun.
      // Falls Rüstung aus dem Backpack rauszieht: separat per Button (`unequip-armor`).
      return null;
    }

    const itemData = item.toObject();
    if (zone === "spellbook" && item.type === "spell") {
      itemData.system = itemData.system || {};
    }
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  private static validateZoneFit(zone: DropZone, itemType: string): boolean {
    if (zone === "armor" && itemType !== "armor") {
      ui.notifications?.warn("In den Rüstungsslot passt nur Rüstung.");
      return false;
    }
    if (zone === "spellbook" && itemType !== "spell") {
      ui.notifications?.warn("Ins Spellbook passen nur Zauber.");
      return false;
    }
    if (zone === "backpack" && itemType === "spell") {
      ui.notifications?.warn("Zauber gehören ins Spellbook.");
      return false;
    }
    return true;
  }

  private async equipArmor(item: any, isInternal: boolean): Promise<void> {
    const actor = this.actor;
    // Andere getragene Rüstungen ablegen
    const others = (actor.items?.contents ?? []).filter(
      (i: any) => i.type === "armor" && i.system?.equipped && i.id !== item.id,
    );
    for (const other of others) {
      await other.update({ "system.equipped": false });
    }

    if (isInternal) {
      await item.update({ "system.equipped": true });
      return;
    }

    const data = item.toObject();
    data.system = data.system || {};
    data.system.equipped = true;
    await actor.createEmbeddedDocuments("Item", [data]);
  }

  private bindAttributeRolls(root: HTMLElement): void {
    const actor = this.actor;
    root.querySelectorAll("[data-action='roll-attribute']").forEach((el) => {
      const button = el as HTMLElement;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const key = button.dataset.attribute as AttributeKey | undefined;
        if (!key) return;
        void actor.rollAttribute(key);
      });
    });
  }

  private bindItemActions(root: HTMLElement): void {
    const actor = this.actor;
    root.querySelectorAll<HTMLElement>("[data-action]").forEach((el) => {
      const action = el.dataset.action;
      if (!action) return;
      el.addEventListener("click", async (event) => {
        const itemEl = (event.target as HTMLElement | null)?.closest(
          "[data-item-id]",
        ) as HTMLElement | null;
        const itemId = itemEl?.dataset.itemId;
        const item = itemId ? actor.items.get(itemId) : null;

        switch (action) {
          case "open-item":
            event.preventDefault();
            item?.sheet?.render(true);
            return;
          case "delete-item":
            event.preventDefault();
            if (!item) return;
            await item.delete();
            return;
          case "cast-spell":
            event.preventDefault();
            if (!item) return;
            await item.castSpell?.();
            return;
          case "attack-weapon":
            event.preventDefault();
            if (!item) return;
            await item.attack?.();
            return;
          case "use-ability":
            event.preventDefault();
            if (!item) return;
            await item.useAbility?.();
            return;
          case "unequip-armor":
            event.preventDefault();
            if (!item) return;
            await item.update({ "system.equipped": false });
            return;
          case "equip-armor":
            event.preventDefault();
            if (!item) return;
            await this.equipArmor(item, true);
            return;
          default:
            Logger.debug("Unhandled sheet action", { action });
        }
      });
    });
  }

  private static unwrap(html: JQuery | HTMLElement): HTMLElement | null {
    return (
      (html as { get?: (i: number) => HTMLElement }).get?.(0) ??
      (html as HTMLElement) ??
      null
    );
  }
}
